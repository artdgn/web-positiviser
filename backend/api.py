import logging

import fastapi
from fastapi.middleware import cors

from backend import data_models
from backend.sentiment import flairnlp
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


@app.post("/sentiment/", response_model=data_models.ResponseData)
def sentiment_flair(data: data_models.RequestData) -> data_models.ResponseData:
    df_out = flairnlp.sentiment_results_dataframe(data.texts)

    return data_models.ResponseData(
        values=df_out[data_models.Cols.score].to_list(),
        ranks=df_out[data_models.Cols.score].rank(method='first').to_list())
