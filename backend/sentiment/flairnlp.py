import functools
import logging
import os
import re
import shutil
from typing import List, Tuple, Iterable

import flair
import pandas as pd
import segtok.tokenizer

from backend import data_models
from backend.sentiment import domain_vocab
from backend.utils import common


logger = logging.getLogger(__name__)

cols = data_models.Cols


def sentiment_results_dataframe(texts: Iterable[str]):
    # TODO: refactor into a class with (caching, filtering, substituting, deduping..)

    texts_filtered = [' '.join(_tokenizer(s)) for s in texts]

    df_in = pd.DataFrame({cols.text: texts_filtered})

    no_dups = df_in.drop_duplicates()

    replaced_vocab_texts = domain_vocab.substitute_words(no_dups[cols.text])

    no_dups[cols.score], no_dups[cols.processed_text] = (
        model.negativity_scores(tuple(replaced_vocab_texts)))

    logger.info(f"no dups:\n{no_dups.sort_values(cols.score).to_markdown(floatfmt='.3f')}")

    return pd.merge(df_in, no_dups, on='text', how='left')


def _tokenizer(text):
    return segtok.tokenizer.symbol_tokenizer(
        ' '.join(flair.data.word_tokenizer(text)))


class _RNNModel:
    flair_model_name = 'sentiment-fast'

    _model: flair.models.TextClassifier = None
    _vocab = set()
    _max_pred_tokens = 20

    @property
    def _model_path(self):
        return common.project_path(f'data/{self.flair_model_name}.pt')

    @property
    def model(self):
        if self._model is None:
            self.load()
        return self._model

    def load(self):
        path = self._model_path

        if not os.path.exists(path):
            _ = flair.models.TextClassifier.load(self.flair_model_name)
            flair_cache_path = flair.models.TextClassifier._fetch_model(self.flair_model_name)
            shutil.copy(flair_cache_path, path)

        self._model = flair.models.TextClassifier.load(path)

    @staticmethod
    def _negativity_score(sentence: flair.data.Sentence):
        if sentence.to_plain_string() == '':
            return 0
        elif sentence.labels[0].value == 'NEGATIVE':
            return 0.5 + 0.5 * sentence.labels[0].score
        else:
            return 0.5 - 0.5 * sentence.labels[0].score

    def _texts_prep(self, str_list: Iterable[str]) -> List[flair.data.Sentence]:
        sents = [flair.data.Sentence(s, use_tokenizer=_tokenizer)
                 for s in str_list]
        self._sanitize_oov(sents)
        self._truncate_long_texts(sents)
        return sents

    @functools.lru_cache(maxsize=1000)
    def negativity_scores(self, str_list: Tuple[str]):
        sents = self._texts_prep(str_list)
        self.model.predict(sents, mini_batch_size=1024, verbose=True)
        scores = [self._negativity_score(s) for s in sents]
        texts = [s.to_plain_string() for s in sents]
        return scores, texts

    def _extract_embedding_vocab(self):
        return (self.model.document_embeddings
                .embeddings.embeddings[0]
                .precomputed_word_embeddings.index2word)

    def _load_vocab(self):
        vocab_raw = self._extract_embedding_vocab()

        # only words, no numbers or special chars
        word_re = re.compile(r'[a-z A-Z]{2,}')
        vocab_filt = [w for w in vocab_raw if word_re.fullmatch(w)]

        # vocab is assumed to be ordered by frequency
        self._vocab = set(vocab_filt)

    @property
    def vocab(self):
        if not (self._vocab):
            self._load_vocab()
        return self._vocab

    def _sanitize_oov(self, sentences: List[flair.data.Sentence]):
        for sent in sentences:
            sent.tokens = [t for t in sent.tokens if t.text in self.vocab]

    def _truncate_long_texts(self, sentences: List[flair.data.Sentence]):
        for sent in sentences:
            sent.tokens = sent.tokens[:self._max_pred_tokens]


class _TransfomerModel(_RNNModel):
    flair_model_name = 'sentiment'

    def _extract_embedding_vocab(self):
        return list(self.model.document_embeddings.tokenizer.vocab.keys())


# model = _RNNModel()
model = _TransfomerModel()

model.load()
