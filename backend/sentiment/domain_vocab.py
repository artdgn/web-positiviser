from typing import List

import pandas as pd

_translations = {
    r'covid|cases|pandemic|virus|coronavirus': 'sickness',
    r'trump': 'bafoon'
}


def substitute_words(texts: List[str]):
    return (pd.Series(texts).str.lower()
            .replace(_translations, regex=True)
            .to_list())
