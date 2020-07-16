## Negativity Balancer:
Using sentiment analysis to reduce bad news visibility.

![bad-news](https://user-images.githubusercontent.com/29574203/87683729-c45a6f80-c7c4-11ea-9484-34deedd7933e.gif)

## What is this?
- A chrome extension that uses a sentiment analysis model
running in the background to score elements based on negativity 
of the text in them and adjust the style to reduce their visibility.
- This is very much a work in progress and not a ready to be used extension
since it requires running an additional service locally for getting
reasonable sentiment scores.
- The negativity classification is by no means perfect, but it does 
work to re-balance the amount of negative and positive items on different pages.
  

### Running locally 


#### Browser extension (Chrome for now):
- Install (Chrome):
    - Navigate to extensions.
    - Enable "developer mode".
    - "Load unpacked extensions".
    - Navigate to "/extension" folder in this project.
- To update (on code changes): go to extension details and press update.
   


#### Python inference server:
- Install in local virtual environment: `make install`
- Run server: `make server` (first run will take time to download the model)

### Credits:
- Initial code for browser extension functionality copied from https://github.com/RobSpectre/Trump-Filter