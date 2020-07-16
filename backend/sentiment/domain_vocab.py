from typing import List

import pandas as pd

_translations = {
    r'covid|cases|pandemic|virus|coronavirus': 'sickness',
    r'trump': 'dictator'
}


def substitute_words(texts: List[str]):
    return (pd.Series(texts).astype(str).str.lower()
            .replace(_translations, regex=True)
            .to_list())
