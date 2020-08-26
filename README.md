![CI](https://github.com/artdgn/negativity-balancer/workflows/CI/badge.svg) ![Docker Cloud Build Status](https://img.shields.io/docker/cloud/build/artdgn/negativity-balancer?label=dockerhub&logo=docker)

# Negativity Balancer:
Using sentiment analysis to reduce negative content visibility.

![negativity-balancer.gif](https://artdgn.github.io/images/negativity-balancer.gif)

## What does this do?
A browser extension that finds negative elements on the page and makes them less visible:
- Negativity is calculated using either in browser rule based logic or an optional deep learning model running locally in the background.
- The user controls various options (negativity threshold, restyling options) via the options menu:
    - Visibility is reduced by adjusting transparency, or by hiding the element completely.
    - Colours can be added for inspection, or for examining the positivity.
    - Settings can be saved per site or globally.
    - An overall positivity score per page is displayed.

## Using the extension
I've started the process to submit it to Chrome and Firefox extension stores. However, it will take a while, as this is my first extension.
In the meanwhile, it is possible to use it locally by cloning this repo and following the instructions below.

## Running locally 

### Build the extension locally
<details><summary>Building instructions</summary>

- Clone and go to `extension/` folder:
- To install in local environment: `npm install`
- Building: `npm start` for development, `npm run build` for packaging into a zip file.
</details>

### Load browser extension into Chrome or Firefox:
<details><summary>Chrome</summary>

- Extensions -> Enable "developer mode" -> 
"Load unpacked extensions" -> Navigate to `/extension/dist` folder in this project.
- To update (on code changes): and go to extension details and press update / reload.
- Docs: [Chrome docs](https://developer.chrome.com/extensions/getstarted#manifest)
</details>

<details><summary>Firefox</summary>

- To load for development (will be removed after browser close, but easier to reload on code change):
    - Go to `about:debugging` -> This Firefox -> "Load Temprorary Add-on.." -> 
    Navigate to `/extension/dist` -> select manifest file.
    - Press "Reload" to update on code changes.
- To load for continuous usage (persistent after closing):
    - Go to `about:config` and set `xpinstall.signatures.required` to False to be able to load a local extension.
    - Run `npm run-script build` to package the extensions into a zip file.
    - Go to `about:addons` -> "gear" icon -> "Install add-on from file.." -> 
    Navigate to `/extension/` folder in this project -> choose `negativity-balancer.zip`.
    - To update (on code changes): repeat previous two steps.
- Docs: [Firefox docs](https://extensionworkshop.com/documentation/develop/testing-persistent-and-restart-features/)
</details>

### Sentiment scoring options:

1. Browser side, rule based: Any of `(JS)` marked options in the "Scoring" drop-down.

2. Python inference server:
    <details><summary>Running in docker without local python</summary>

    - `docker run -it --rm -p 8000:8000 artdgn/negativity-balancer`
    </details>

    <details><summary>Local python</summary>

    - To create local virtual environment and install (after cloning repo): `make install`
    - Run server: `make server`
    </details>

### Credits:
- Python (DL based) sentiment analysis model and package: [flair NLP](https://github.com/flairNLP/flair)
- JS sentiment analysis packages:
    - [vaderSentiment](https://github.com/cjhutto/vaderSentiment) (called JS-Vader in options menu)
    - [AFINNSentiment](https://github.com/thisandagain/sentiment ) (called JS-AFINN in options menu)
- Backend API framework: [fastapi](https://github.com/tiangolo/fastapi)
- Initial code for browser extension functionality copied from [Trump-Filter](https://github.com/RobSpectre/Trump-Filter)