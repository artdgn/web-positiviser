import os
import shutil
from typing import List

import flair

from backend.utils import common


class _RNNModel:
    flair_model_name = 'sentiment-fast'

    _model: flair.models.TextClassifier = None

    @property
    def model_path(self):
        return common.project_path(f'data/{self.flair_model_name}.pt')

    @property
    def model(self):
        if self._model is None:
            self.load()
        return self._model

    def load(self):
        path = self.model_path

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

    def negativity_scores(self, str_list: List[str]):
        sents = [flair.data.Sentence(s, use_tokenizer=True) for s in str_list]
        self.model.predict(sents, mini_batch_size=1024, verbose=True)
        return [self._negativity_score(s) for s in sents]


class _TransfomerModel(_RNNModel):
    flair_model_name = 'sentiment'


model = _RNNModel()
# model = _TransfomerModel()

model.load()