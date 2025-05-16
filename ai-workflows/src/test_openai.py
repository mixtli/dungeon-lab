import os
from openai import OpenAI
import base64
import json
import cv2
import matplotlib.pyplot as plt

# Initialize OpenAI client
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# Load and encode image
def encode_image_to_base64(image_path):
    with open(image_path, "rb") as img_file:
        return base64.b64encode(img_file.read()).decode("utf-8")


# Ask GPT-4 Vision for wall coordinates
def get_wall_coordinates(image_path):
    base64_image = encode_image_to_base64(image_path)
    response = client.responses.create(
        model="gpt-4o",
        input=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": (
                            "This is a dungeon map with white walls on a black background. "
                            "Please return an approximate list of wall paths as arrays of coordinate points. "
                            "Each path should be a list of {x, y} objects, tracing continuous walls. "
                            "Only include major visible wall lines. Respond in valid JSON format only."
                        ),
                    },
                    {
                        "type": "input_image",
                        "image_url":  f"data:image/png;base64,{base64_image}",
                    },
                ],
            }
        ],
        temperature=0,
    )
    print(response)
    return response.choices[0].message.content


# Optional: Draw result on image
def draw_wall_paths(image_path, wall_paths):
    img = cv2.imread(image_path)
    for path in wall_paths:
        for i in range(len(path) - 1):
            pt1 = (path[i]["x"], path[i]["y"])
            pt2 = (path[i + 1]["x"], path[i + 1]["y"])
            cv2.line(img, pt1, pt2, (0, 255, 0), 1)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    plt.imshow(img_rgb)
    plt.title("Detected Wall Paths")
    plt.axis("off")
    plt.show()


# Run
image_path = "dungeon_map.png"
raw_response = get_wall_coordinates(image_path)

# Parse the JSON content from the GPT response
try:
    wall_paths = json.loads(raw_response)
    draw_wall_paths(image_path, wall_paths)
except json.JSONDecodeError:
    print("GPT response could not be parsed as JSON.")
    print("Response:")
    print(raw_response)
