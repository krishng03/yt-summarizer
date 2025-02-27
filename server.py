from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import yt_dlp
from youtube_transcript_api import YouTubeTranscriptApi
import google.generativeai as genai
from datetime import timedelta
import json
import os
import cv2

app = Flask(__name__)

FRAME_DIR = "public/frames"
os.makedirs(FRAME_DIR, exist_ok=True)

CORS(app, resources={
    r"/*": {
        "origins": "http://localhost:3000",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type"],
        "supports_credentials": True
    }
})

genai.configure(api_key="GEMINI-API-KEY") # ADD HERE.... HERE
model = genai.GenerativeModel("gemini-1.5-flash")

def get_english_subtitles(video_url):
    try:
        ydl_opts = {}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            video_title = info.get('title', 'Unknown Title')
            video_description = info.get('description', 'No description available')

        video_id = video_url.split("v=")[-1]
        print(f"Fetching transcript for video ID: {video_id}")
        
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])

        if transcript:
            formatted_subtitles = ''
            for entry in transcript:
                formatted_subtitles += entry['text'] + ' '
            return transcript, formatted_subtitles, video_title, video_description
        else:
            print("No English subtitles available.")
            return None
    except Exception as e:
        print(f"An error occurred: {e}")
        return None

def format_time(seconds):
    return str(timedelta(seconds=seconds))[:-3]

def group_text_by_duration(data, duration_limit=30):
    grouped_text = {}
    current_group = []
    current_duration = 0.0
    group_start_time = 0.0

    for entry in data:
        if current_duration + entry['duration'] <= duration_limit:
            current_group.append(entry['text'])
            current_duration += entry['duration']
        else:
            group_end_time = group_start_time + current_duration
            grouped_text[f"{format_time(group_start_time)}-{format_time(group_end_time)}"] = " ".join(current_group)
            group_start_time = group_end_time
            current_group = [entry['text']]
            current_duration = entry['duration']
    
    if current_group:
        group_end_time = group_start_time + current_duration
        grouped_text[f"{format_time(group_start_time)}-{format_time(group_end_time)}"] = " ".join(current_group)
    
    return grouped_text

@app.route('/get_summary', methods=['POST'])
def get_summary():
    data = request.get_json()
    video_url = data.get('video_url')
    
    if not video_url:
        return jsonify({"error": "No video URL provided"}), 400
    
    transcript, en_subtitles, video_title, video_description = get_english_subtitles(video_url)
    
    if transcript is None:
        return jsonify({"error": "No subtitles found for the video."}), 404
    
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

    Follow the below instructions:
    1. Give headings within <h2></h2>
    2. Give paragraphs within <p></p>
    3. Give unordered list bullet points within <ul><li></li></ul>
    4. Give ordered list bullet points within <ol><li></li></ol>
    5. Enclose the bold text between <strong></strong>
    '''
    
    response = model.generate_content(prompt_template).text
    
    if response:
        return jsonify({"summary": response}), 200
    else:
        return jsonify({"error": "Failed to generate summary"}), 500

@app.route('/get_flashcards', methods=['POST', 'OPTIONS'])
def get_flashcards():
    if request.method == "OPTIONS":
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response
    
    data = request.get_json()
    video_url = data.get('video_url')
    
    if not video_url:
        return jsonify({"error": "No video URL provided"}), 400
    
    transcript, en_subtitles, video_title, video_description = get_english_subtitles(video_url)
    
    if transcript is None:
        return jsonify({"error": "No subtitles found for the video."}), 404
    
    timestamped_data = group_text_by_duration(transcript, duration_limit=30)
    
    prompt_template = f'''
    Generate flashcards in the following JSON format:
        [
            {{"heading": "Some heading", "description": "Key points from 0:00-0:30"}},
            {{"heading": "Another heading", "description": "Key points from 0:30-1:00"}}
        ]
        
        Use this video information:
        Title: {video_title}
        Description: {video_description}
        Content by timestamp: {timestamped_data}
    '''
    
    response = model.generate_content(prompt_template)

    if response and response.text:
        try:
            cleaned_response = response.text.strip()
            cleaned_response = cleaned_response.replace('```json', '').replace('```', '').strip()
            
            if not cleaned_response.startswith('['):
                cleaned_response = cleaned_response[cleaned_response.find('['):]
            if not cleaned_response.endswith(']'):
                cleaned_response = cleaned_response[:cleaned_response.rfind(']')+1]
            
            flashcards = json.loads(cleaned_response)
            return jsonify({"flashcards": flashcards}), 200
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}")
            print(f"Raw response: {response.text}")
            return jsonify({"error": "Failed to parse AI response"}), 500
    else:
        print(f"Error in get_flashcards: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/get_images', methods=['POST'])
def get_images():

    try:
        data = request.get_json()
        video_url = data.get('video_url')
        if not video_url:
            return jsonify({"error": "No video URL provided"}), 400

        video_id = video_url.split("v=")[-1]
        video_path = f"temp_{video_id}.mp4"

        try:
            ydl_opts = {
                "format": "bestvideo[height<=720]+bestaudio/best[height<=720]",
                "merge_output_format": "mp4",  # Ensure it merges formats
                "outtmpl": video_path,
                "quiet": True,
                "postprocessors": [{"key": "FFmpegVideoConvertor", "preferedformat": "mp4"}]
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([video_url])
            
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise Exception("Failed to open video file")
            
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
            frame_interval = int(fps * 30)

            count = 0
            frames = []

            while count * frame_interval < total_frames:
                cap.set(cv2.CAP_PROP_POS_FRAMES, count * frame_interval)
                ret, frame = cap.read()
                if not ret:
                    break

                frame_filename = f"frame_{count}.jpg"
                frame_path = os.path.join(FRAME_DIR, frame_filename)
                cv2.imwrite(frame_path, frame)
                frames.append(frame_filename)
                count += 1

            cap.release()
            os.remove(video_path) 
            

            response = jsonify({"frames": frames})
            response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
            response.headers.add("Access-Control-Allow-Credentials", "true")
            return response, 200

        except Exception as e:
            return jsonify({"error": f"Error processing video: {str(e)}"}), 500

    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True)

