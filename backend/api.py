import logging
from typing import List

import pandas as pd
import pydantic
import fastapi
from fastapi.middleware import cors

from backend.utils import common
from backend.sentiment import flairnlp

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
    values = flairnlp.model.negativity_scores(data.texts)

    values_df = pd.DataFrame({'values': values, 'texts': data.texts}
                             ).sort_values('values')
    logger.info(f"texts and values:\n{values_df.to_markdown(floatfmt='.3f')}")

    return values

