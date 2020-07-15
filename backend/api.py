import logging
from typing import List

import pandas as pd
import pydantic
import fastapi
from fastapi.middleware import cors

from backend.utils import common
from backend.sentiment import flairnlp, domain_vocab

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
def sentiment_flair(data: RequestData):
    replaced_vocab_texts = domain_vocab.substitute_words(data.texts)
    scores, filtered_texts = flairnlp.model.negativity_scores(tuple(replaced_vocab_texts))

    values_df = pd.DataFrame(
        {'score': scores, 'text': data.texts, 'filtered_text': filtered_texts}
    ).sort_values('score')

    logger.info(f"scores and texts:\n{values_df.to_markdown(floatfmt='.3f')}")

    return scores

