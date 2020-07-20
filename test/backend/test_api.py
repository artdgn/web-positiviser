import numpy as np
import pytest
from fastapi import testclient

from backend import api


@pytest.fixture(scope='module')
def api_client():
    return testclient.TestClient(api.app)


def test_api_basic(api_client):
    resp = api_client.post(
        '/sentiment/', json={'texts': ['good thing happened', 'not very good thing']})
    assert resp.ok

    results = resp.json()
    assert results['values'][0] < 0.5
    assert results['values'][1] > 0.5
    assert results['ranks'] == [1.0, 2.0]


@pytest.mark.parametrize(
    'body', [None, {'texts': None}, {'texts': 'not a list'}, {'wrong_field': ['word']}])
def test_api_basic_fails(api_client, body):
    resp = api_client.post('/sentiment/', json=body)
    assert resp.status_code == 422


def post_sentiment_texts(client, texts):
    return client.post('/sentiment/', json={'texts': texts}).json()


@pytest.mark.parametrize('texts, expected_pos, expected_neg', [
    (['good thing happened', 'not very good thing', 'trump is here'], [0], [1, 2]),
    (['covid is rising', 'pandemic news'], [], [0, 1]),
])
@pytest.mark.integration
def test_sentiment_flair_basic(api_client, texts, expected_pos, expected_neg):
    res = post_sentiment_texts(api_client, texts)

    # check positives
    assert all([res['values'][ind] < 0.5 for ind in expected_pos])

    # check negatives
    assert all([res['values'][ind] > 0.5 for ind in expected_neg])

    # check ranks
    expected_ranks = np.argsort(res['values']).astype(float) + 1
    assert (expected_ranks == res['ranks']).all()


@pytest.mark.integration
def test_sentiment_flair_repeated(api_client):
    res = post_sentiment_texts(
        api_client, ['good thing happened'] * 2 + ['bad thing happened'] * 2)
    assert res['values'][0] < res['values'][2]
    assert res['values'][0] == res['values'][1]
    assert res['values'][2] == res['values'][3]
