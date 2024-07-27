"""Logging module adapted from Auto-GPT."""

from __future__ import annotations
import logging
import os
import random
import re
import time
import json
from logging import LogRecord
from typing import Any, List, TYPE_CHECKING

from colorama import Fore, Style
from common.utils import Singleton

if TYPE_CHECKING:
    from common.types.llm import LLMResult


class JsonFileHandler(logging.FileHandler):
    def __init__(self, filename, mode="a", encoding=None, delay=False):
        super().__init__(filename, mode, encoding, delay)

    def emit(self, record):
        json_data = json.loads(self.format(record))
        with open(self.baseFilename, "w", encoding="utf-8") as f:
            json.dump(json_data, f, ensure_ascii=False, indent=4)


class JsonFormatter(logging.Formatter):
    def format(self, record):
        return record.msg


class Logger(metaclass=Singleton):
    """
    Logger that handle titles in different colors.
    Outputs logs in console, activity.log, and errors.log
    For console handler: simulates typing
    """

    def __init__(self):
        # create log directory if it doesn't exist
        this_files_dir_path = os.path.dirname(__file__)
        log_dir = os.path.join(this_files_dir_path, "../logs")
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)

        log_file = "activity.log"
        error_file = "error.log"

        console_formatter = AutoGptFormatter("%(title_color)s%(message)s")

        # Create a handler for console which simulate typing
        self.typing_console_handler = TypingConsoleHandler()
        self.typing_console_handler.setLevel(logging.INFO)
        self.typing_console_handler.setFormatter(console_formatter)

        # Create a handler for console without typing simulation
        self.console_handler = ConsoleHandler()
        self.console_handler.setLevel(logging.DEBUG)
        self.console_handler.setFormatter(console_formatter)

        # Info handler in activity.log
        self.file_handler = logging.FileHandler(os.path.join(log_dir, log_file), "a", "utf-8")
        self.file_handler.setLevel(logging.DEBUG)
        info_formatter = AutoGptFormatter("%(asctime)s %(levelname)s %(title)s %(message_no_color)s")
        self.file_handler.setFormatter(info_formatter)

        # Error handler error.log
        error_handler = logging.FileHandler(os.path.join(log_dir, error_file), "a", "utf-8")
        error_handler.setLevel(logging.ERROR)
        error_formatter = AutoGptFormatter(
            "%(asctime)s %(levelname)s %(module)s:%(funcName)s:%(lineno)d %(title)s" " %(message_no_color)s"
        )
        error_handler.setFormatter(error_formatter)

        self.typing_logger = logging.getLogger("TYPER")
        self.typing_logger.addHandler(self.typing_console_handler)
        self.typing_logger.addHandler(self.file_handler)
        self.typing_logger.addHandler(error_handler)
        self.typing_logger.setLevel(logging.DEBUG)

        self.logger = logging.getLogger("LOGGER")
        self.logger.addHandler(self.console_handler)
        self.logger.addHandler(self.file_handler)
        self.logger.addHandler(error_handler)
        self.logger.setLevel(logging.DEBUG)

        self.json_logger = logging.getLogger("JSON_LOGGER")
        self.json_logger.addHandler(self.file_handler)
        self.json_logger.addHandler(error_handler)
        self.json_logger.setLevel(logging.DEBUG)

        self.logger.propagate = False
        self.typing_logger.propagate = False
        self.json_logger.propagate = False

        self.speak_mode = False
        self.chat_plugins = []

    def typewriter_log(self, title="", title_color="", content="", speak_text=False, level=logging.INFO):
        for plugin in self.chat_plugins:
            plugin.report(f"{title}. {content}")

        if content:
            if isinstance(content, list):
                content = "\n".join(content)
        else:
            content = ""

        self.typing_logger.log(level, content, extra={"title": title, "color": title_color})

    def debug(
        self,
        message,
        title="",
        title_color="",
    ):
        self._log(title, title_color, message, logging.DEBUG)

    def info(
        self,
        message,
        title="",
        title_color="",
    ):
        self._log(title, title_color, message, logging.INFO)

    def warn(
        self,
        message,
        title="",
        title_color="",
    ):
        self._log(title, title_color, message, logging.WARN)

    def error(self, title, message=""):
        self._log(title, Fore.RED, message, logging.ERROR)

    def _log(
        self,
        title: str = "",
        title_color: str = "",
        message: str = "",
        level=logging.INFO,
    ):
        if isinstance(message, list):
            if len(message) > 0:
                message = "\n".join([str(m) for m in message])
            else:
                message = ""
        self.logger.log(level, message, extra={"title": str(title), "color": str(title_color)})

    def log(self, level, msg, *args, **kwargs):
        self._log("", "", msg, level)

    def set_level(self, level):
        self.logger.setLevel(level)
        self.typing_logger.setLevel(level)

    def double_check(self, additionalText=None):
        if not additionalText:
            additionalText = (
                "Please ensure you've setup and configured everything"
                " correctly. Read https://github.com/Torantulino/Auto-GPT#readme to "
                "double check. You can also create a github issue or join the discord"
                " and ask there!"
            )

        self.typewriter_log("DOUBLE CHECK CONFIGURATION", Fore.YELLOW, additionalText)

    def log_json(self, data: Any, file_name: str) -> None:
        # Define log directory
        this_files_dir_path = os.path.dirname(__file__)
        log_dir = os.path.join(this_files_dir_path, "../logs")

        # Create a handler for JSON files
        json_file_path = os.path.join(log_dir, file_name)
        json_data_handler = JsonFileHandler(json_file_path)
        json_data_handler.setFormatter(JsonFormatter())

        # Log the JSON data using the custom file handler
        self.json_logger.addHandler(json_data_handler)
        self.json_logger.debug(data)
        self.json_logger.removeHandler(json_data_handler)

    def log_prompt(self, prompt: List[dict]) -> None:
        self.debug("", "-=-=-=-=-=-=-=-=Prompt Start-=-=-=-=-=-=-=-=", Fore.MAGENTA)
        for p in prompt:
            content = p["content"] if p["content"] is not None else ""
            if "tool_calls" in p:
                content += "\nTool Calls:\n"
                for tool_call in p["tool_calls"]:
                    content += tool_call.function.name + "\n"
                    content += tool_call.function.arguments + "\n"
                content = content.strip()
            self.debug(
                content,
                title=f'==={p["role"]}===\n',
                title_color=Fore.MAGENTA,
            )
        self.debug("", "-=-=-=-=-=-=-=-=Prompt End-=-=-=-=-=-=-=-=", Fore.MAGENTA)

    def log_llm_result(self, response: LLMResult) -> None:
        if response.content is None:
            content = ""
        elif isinstance(response.content, str):
            content = response.content
        elif isinstance(response.content, dict):
            content = json.dumps(response.content, indent=2)
        if response.tool_calls is not None:
            for tool_call in response.tool_calls:
                content += f"\n{tool_call.function.name}\n{tool_call.function.arguments}\n"
        logger.info("", f"--------------------------------------\n{content.strip()}", Fore.BLUE)

    def get_log_directory(self):
        this_files_dir_path = os.path.dirname(__file__)
        log_dir = os.path.join(this_files_dir_path, "../logs")
        return os.path.abspath(log_dir)


"""
Output stream to console using simulated typing
"""


class TypingConsoleHandler(logging.StreamHandler):
    def emit(self, record):
        min_typing_speed = 0.05
        max_typing_speed = 0.01

        msg = self.format(record)
        try:
            words = re.split(r"(\s+)", msg)
            for i, word in enumerate(words):
                print(word, end="", flush=True)
                # if i < len(words) - 1:
                #     print(" ", end="", flush=True)
                typing_speed = random.uniform(min_typing_speed, max_typing_speed)
                time.sleep(typing_speed)
                # type faster after each word
                min_typing_speed = min_typing_speed * 0.95
                max_typing_speed = max_typing_speed * 0.95
            print()
        except Exception:
            self.handleError(record)


class ConsoleHandler(logging.StreamHandler):
    def emit(self, record) -> None:
        msg = self.format(record)
        try:
            print(msg)
        except Exception:
            self.handleError(record)


class AutoGptFormatter(logging.Formatter):
    """
    Allows to handle custom placeholders 'title_color' and 'message_no_color'.
    To use this formatter, make sure to pass 'color', 'title' as log extras.
    """

    def format(self, record: LogRecord) -> str:
        if hasattr(record, "color") and getattr(record, "color", ""):
            record.title_color = (
                getattr(record, "color")
                + getattr(record, "title", "")
                # + " "
                + Style.RESET_ALL
            )
        else:
            record.title_color = getattr(record, "title", "")

        # Add this line to set 'title' to an empty string if it doesn't exist
        record.title = getattr(record, "title", "")

        if hasattr(record, "msg"):
            record.message_no_color = remove_color_codes(getattr(record, "msg"))
        else:
            record.message_no_color = ""

        # Remove color codes from the message
        record.message_no_color = remove_color_codes(getattr(record, "msg", ""))
        return super().format(record)


def remove_color_codes(s: str) -> str:
    ansi_escape = re.compile(r"\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])")
    return ansi_escape.sub("", s)


logger = Logger()


def get_logger():
    return logger


def typewriter_log(content="", color="", level=logging.INFO):
    for line in content.split("\n"):
        logger.typewriter_log(line, title_color=color, level=level)
