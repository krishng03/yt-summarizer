from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import requests
import json
import yt_dlp
from youtube_transcript_api import YouTubeTranscriptApi

app = FastAPI()

def get_english_subtitles(video_url):
    try:
        ydl_opts = {}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            video_title = info.get('title', 'Unknown Title')
            video_description = info.get('description', 'No description available')
        video_id = video_url.split("v=")[-1]
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
        formatted_subtitles = ''
        for entry in transcript:
            formatted_subtitles = formatted_subtitles + entry['text'] + ' '
        return formatted_subtitles, video_title, video_description
    except Exception as e:
        print(f"An error occurred: {e}")
        return None

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            url = "http://localhost:11434/api/generate"
            video_url = await websocket.receive_text()
            en_subtitles, video_title, video_description = get_english_subtitles(video_url)
            print(video_title)
            print(video_description)
            prompt_template = f'''
            Given the following video information, create a comprehensive summary:

            VIDEO TITLE: {video_title}

            VIDEO DESCRIPTION: {video_description}

            TRANSCRIPT: {en_subtitles}

            Please provide a well-structured summary that includes:
            1. Main topic and key points
            2. Important details and insights
            3. Key conclusions or takeaways

            Format the summary in clear paragraphs and keep it concise yet informative.
            '''
            headers = {
                "Content-Type": "application/json",
            }
            data = {
                "model": "llama3.2:1b",
                "prompt": prompt_template,
                "stream": False
            }
            response = requests.post(url, headers=headers, data=json.dumps(data))
            if(response.status_code == 200):
                try :
                    response_data = response.json()
                    await websocket.send_text(f"{response_data['response']}")
                except Exception as e:
                    print(e)
            else:
                print("Error in fetching response")
    except WebSocketDisconnect:
        print("Client disconnected")          
