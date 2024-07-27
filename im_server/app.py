import json
import uuid
import logging
from copy import deepcopy
from datetime import datetime
from urllib.parse import quote, unquote

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pymilvus import connections
from starlette.middleware.cors import CORSMiddleware

from common.log import logger
from common.types import (
    AgentEntry,
    AgentInfo,
    AgentMessage,
    AgentRegistryQueryParam,
    AgentRegistryRetrivalParam,
    AgentRegistryTeamupOutput,
    AgentRegistryTeamupParam,
    ChatRecordFetchParam,
    CommunicationType,
)
from common.utils.database_utils import AutoStoredDict
from common.utils.milvus_utils import ConfigMilvusWrapper

# Set a server instance
app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware, # A middleware to share cross-domain resource  
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectionManager:
    def __init__(self):
        self.agent_to_websocket: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, agent_name: str) -> str:
        await websocket.accept()
        self.agent_to_websocket[agent_name] = websocket
        print(self.agent_to_websocket)

    async def disconnect(self, agent_name: str):
        self.agent_to_websocket.pop(agent_name, None)
        print(self.agent_to_websocket)

    async def send_personal_message(self, receiver: str, message: AgentMessage):
        # try:
        #     breakpoint()
        #     websocket = self.agent_to_websocket[receiver]
        # except:
        #     logger.error(f"Failed to find the websocket for {receiver}")
        # await websocket.send_text(message.model_dump_json())
        try:
            websocket = self.agent_to_websocket[receiver]
            await websocket.send_text(message.model_dump_json())
        except KeyError:
            logger.error(f"Failed to find the websocket for {receiver}")
        except Exception as e:
            logger.error(f"Error sending message to {receiver}: {e}")
        
    def get_all_connections(self):
        return list(self.agent_to_websocket.keys())

class AgentRegistry:
    """
    Agent Registry block. Providing agent registering and querying services based on Milvus vector database.
    """

    def __init__(self):
        self.agents = ConfigMilvusWrapper("configs/agent_registry.yaml")

    async def register(self, agent: AgentInfo) -> None:
        if agent.name in self.agents:
            return agent.name
        timestamp = datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
        self.agents[agent.name] = AgentEntry(
            name=agent.name,
            desc=agent.desc,
            type=agent.type,
            created_at=timestamp,
        )

    async def retrieve(self, param: AgentRegistryRetrivalParam) -> list[AgentInfo]:
        res = self.agents.search_via_config(param.capabilities)
        deduplicate_ids = set()
        deduplicate_hits = []
        for hits in res:
            for hit in hits:
                if hit.get("name") not in deduplicate_ids:
                    deduplicate_hits.append(hit)
                    deduplicate_ids.add(hit.get("name"))
        return [AgentInfo(name=hit.get("name"), type=hit.get("type"), desc=hit.get("desc")) for hit in deduplicate_hits]

    async def query(self, name: list[str] | str) -> list[AgentInfo | None] | AgentInfo | None:
        result = []
        candidates = name if isinstance(name, list) else [name]
        for agent_name in candidates:
            if agent_name in self.agents:
                result.append(
                    AgentInfo(
                        name=agent_name,
                        desc=self.agents[agent_name].get("desc"),
                        type=self.agents[agent_name].get("type"),
                    )
                )
            else:
                result.append(None)
        if isinstance(name, str):
            return result[0]
        else:
            return result


class SessionManager:
    """
    Session Manager block. Maintaining the basic group chat information.
    """

    def __init__(self):
        self.sessions = AutoStoredDict("database/server/sessions.db", tablename="sessions")

    async def teamup(self, agent_names: list[str], comm_id=None) -> AgentRegistryTeamupOutput:
        if comm_id is None:
            comm_id = uuid.uuid4().hex
        print(f"New Chat comm_id: {comm_id}")
        session_group = []
        for name in agent_names:
            if name in agent_registry.agents.keys():
                session_group.append(name)
        self.sessions[comm_id] = session_group
        return {"comm_id": comm_id, "agent_names": session_group}


logger = logging.getLogger("websocket")

@app.websocket("/ws/{agent_name}")
async def websocket_endpoint(websocket: WebSocket, agent_name: str):
    """
    Endpoint for receiving and sending agent messages
    """
    agent_name = unquote(agent_name)
    await connection_manager.connect(websocket, agent_name)
    

    try:
        while True:
            # 1. listen to the websocket
            data = await websocket.receive_text()
            try:
                # breakpoint()
                # 2. parse the received message using Agent Message protocol
                parsed_data = AgentMessage.model_validate_json(data)
                #breakpoint()
            except:
                logger.error(f"Failed to parse the message: {data}")
            if parsed_data.comm_id not in session_manager.sessions:
                logger.error(f"Failed to find the session {parsed_data.comm_id} for {agent_name}")

            record = chat_record_manager[parsed_data.comm_id]
            record["chat_record"].append(parsed_data)
            chat_record_manager[parsed_data.comm_id] = record
            await send_to_frontend(json.loads(parsed_data.model_dump_json()), "message")
            for receiver in session_manager.sessions[parsed_data.comm_id]:
                # 3. Forward the message to all the members including the sender itself.
                await connection_manager.send_personal_message(receiver, parsed_data)

    except WebSocketDisconnect:
        # logger.warn(f"{agent_name} disconnected")
        agent_name = quote(agent_name)
        await connection_manager.disconnect(agent_name)
        

@app.websocket("/chatlist_ws")
async def websocket_chatlist(websocket: WebSocket):
    await websocket.accept()
    global frontend_ws
    frontend_ws = websocket
    type = CommunicationType.LAUNCH_GOAL
    try:
        while True:
            current_connections = connection_manager.get_all_connections()
            print(f"Current WebSocket connections: {current_connections}")
            
            data = await websocket.receive_text()
            # 解析和处理消息内容
            message_data = json.loads(data)
            content = message_data.get("content", "")
            sender = message_data.get("sender", "")
            # comm_id = message_data.get("comm_id", "")
            
            # 创建AgentRegistryRetrivalParam对象
            param = AgentRegistryRetrivalParam(sender=sender, capabilities=[content])
            
            # 开始检索agent
            agent_infos =await retrieve_assistant(param)
            # breakpoint()
            
            # 选择第一个agent
            if agent_infos:
                selected_agent = agent_infos[0].name
                message_to_agent = AgentMessage(
                    comm_id=uuid.uuid4().hex,
                    sender=sender,
                    content=content,
                    type=type,
                )
                # breakpoint()
                await connection_manager.send_personal_message(selected_agent, message_to_agent)
            #将结果发送回前端
            # response = [info.model_dump() for info in agent_infos]
            # await websocket.send_text(json.dumps(response))
    except WebSocketDisconnect:
        print("Fronted disconnected")
        frontend_ws = None


@app.post("/health_check")
async def health_check():
    return "ok"


@app.post("/register")
async def register_agent(agent: AgentInfo):
    await agent_registry.register(agent)


@app.post("/retrieve_assistant")
async def retrieve_assistant(
    characteristics: AgentRegistryRetrivalParam,
) -> list[AgentInfo]:
    agents = await agent_registry.retrieve(characteristics)
    return agents


@app.post("/query_assistant")
async def query_assistant(
    param: AgentRegistryQueryParam,
) -> list[AgentInfo] | AgentInfo:
    agents = await agent_registry.query(param.name)
    return agents


@app.post("/teamup")
async def teamup(teamup_param: AgentRegistryTeamupParam):
    result = await session_manager.teamup(teamup_param.agent_names + [teamup_param.sender], comm_id=teamup_param.comm_id)
    result["team_name"] = teamup_param.team_name
    chat_record_manager[result["comm_id"]] = {
        # "comm_id": result["comm_id"],
        "comm_id": teamup_param.comm_id,
        "agent_names": result["agent_names"],
        "team_name": teamup_param.team_name,
        "chat_record": [],
    }
    await send_to_frontend(result, "teamup")
    return result


async def send_to_frontend(data: dict, type: str):
    global frontend_ws
    if frontend_ws:
        try:
            new_result = deepcopy(data)
            new_result["frontend_type"] = type
            await frontend_ws.send_text(json.dumps(new_result))
        except WebSocketDisconnect:
            frontend_ws = None


@app.post("/list_all_agents")
async def list_all_agents():
    return agent_registry.agents.items()


@app.post("/fetch_chat_record")
async def fetch_chat_record(param: ChatRecordFetchParam):
    if param.comm_id is None:
        return chat_record_manager.todict()
    if isinstance(param.comm_id, str):
        param.comm_id = [param.comm_id]
    return {comm_id: chat_record_manager[comm_id] for comm_id in param.comm_id}


connections.connect(
    alias="default",
    user="username",
    password="password",
    # host="localhost",
    host="standalone",
    port="19530",
)

agent_registry = AgentRegistry()
connection_manager = ConnectionManager()
session_manager = SessionManager()
chat_record_manager = AutoStoredDict("database/server/chat.db", tablename="chat")
frontend_ws = None

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7788, ws_ping_timeout=None)
