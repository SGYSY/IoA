import requests

goal = "I want to know the annual revenue of Microsoft from 2014 to 2020. Please generate a figure in text format showing the trend of the annual revenue, and give me a analysis report."

response = requests.post(
    "http://127.0.0.1:5050/launch_goal",
    json={
        "goal": goal,
        "max_turns": 20,
        "team_member_names": ["AutoGPT", "Open Interpreter"],   # When it is left "None", the agent will decide whether to form a team autonomously
    },
)

print(response)