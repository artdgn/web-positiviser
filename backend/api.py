import logging
import re
from typing import List

import pandas as pd
import pydantic
import fastapi
from fastapi.middleware import cors

from backend.utils import common

common.pandas_options()

logger = logging.getLogger(__name__)

app = fastapi.FastAPI()

# needed for requests from browser to localhost
app.add_middleware(
    cors.CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# needed for post method
class RequestData(pydantic.BaseModel):
    texts: List[str]


@app.post("/sentiment/")
def sentiment_dumb(data: RequestData):
    words_re = r'\w+'
    neg_re = r'trump|covid|corona|pandemic|virus|cases|death'

    def neg_value(text):
        text = text.lower()
        n_negs = len(re.findall(neg_re, text))
        n_words = len(re.findall(words_re, text))
        return (min(n_negs, 2) + n_negs / n_words) / 3

    values = [neg_value(t) for t in data.texts]

    values_df = pd.DataFrame({'values': values, 'texts': data.texts})
    logger.info(f"texts and values:\n{values_df.to_markdown(floatfmt='.3f')}")

    return values
