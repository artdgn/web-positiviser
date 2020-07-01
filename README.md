## Bad News Fader:
Sentiment analysis to reduce bad news visibility.

### Local development 

#### Python inference server:
- Install in local virtual environment: `make install`
- Run server: `make server` (first run will take time to download the model)

#### Browser extension (Chrome for now):
- Install (Chrome):
    - Navigate to extensions.
    - Enable "developer mode".
    - "Load unpacked extensions".
    - Navigate to "/extension" folder in this project.
- Enable: press extension icon (no disable yet).
- Update (code changes): go to extension details and press update.
   

### Credits:
- Initial code for browser extension functionality copied from https://github.com/RobSpectre/Trump-Filter