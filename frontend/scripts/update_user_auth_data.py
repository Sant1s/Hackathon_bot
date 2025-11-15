#!/usr/bin/env python3
"""
Скрипт для обновления токенов пользователей в users.json.
Читает данные для авторизации из user_auth_data.json, авторизует пользователей
и обновляет users.json с новыми токенами и user_id.
"""

import json
import os
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    print("✗ Ошибка: библиотека 'requests' не установлена!")
    print("  Установите её командой: pip install requests")
    sys.exit(1)

# Базовый URL API (можно изменить через переменную окружения)
BASE_URL = os.getenv("API_BASE_URL", "http://82.202.142.141:8080")
API_ENDPOINT = f"{BASE_URL}/api/v1/auth/login"

# Пути к файлам
SCRIPT_DIR = Path(__file__).parent
AUTH_DATA_PATH = SCRIPT_DIR / "user_auth_data.json"
USERS_JSON_PATH = SCRIPT_DIR / "users.json"


def login_user(phone: str, password: str) -> dict | None:
    """
    Авторизует пользователя на сервере.

    Args:
        phone: Номер телефона пользователя
        password: Пароль пользователя

    Returns:
        Словарь с user_id и token, или None в случае ошибки
    """
    try:
        # Подготавливаем данные для запроса
        payload = {"phone": phone, "password": password}

        # Отправляем запрос
        print(f"Авторизация пользователя с телефоном {phone}...")
        response = requests.post(
            API_ENDPOINT,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30,
        )

        # Проверяем результат
        if response.status_code == 200:
            result = response.json()
            user_id = result.get("user_id")
            token = result.get("token")

            if user_id and token:
                print(f"✓ Успешная авторизация: user_id={user_id}")
                return {"user_id": user_id, "token": token}
            else:
                print(f"✗ Неполный ответ от сервера: {result}")
                return None
        else:
            error_msg = "Неизвестная ошибка"
            try:
                error_data = response.json()
                error_msg = error_data.get("error", {}).get("message", error_msg)
            except:
                error_msg = response.text[:200]

            print(f"✗ Ошибка авторизации ({response.status_code}): {error_msg}")
            return None

    except requests.exceptions.RequestException as e:
        print(f"✗ Ошибка сети: {e}")
        return None
    except Exception as e:
        print(f"✗ Неожиданная ошибка: {e}")
        return None


def load_auth_data() -> list:
    """
    Загружает данные для авторизации из user_auth_data.json.

    Returns:
        Список словарей с данными пользователей
    """
    if not AUTH_DATA_PATH.exists():
        print(f"✗ Файл {AUTH_DATA_PATH} не найден!")
        sys.exit(1)

    try:
        with open(AUTH_DATA_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("auth_data", [])
    except json.JSONDecodeError as e:
        print(f"✗ Ошибка парсинга JSON в {AUTH_DATA_PATH}: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Ошибка чтения файла {AUTH_DATA_PATH}: {e}")
        sys.exit(1)


def load_users_json() -> dict:
    """
    Загружает текущий users.json.

    Returns:
        Словарь с данными users.json
    """
    if not USERS_JSON_PATH.exists():
        # Если файл не существует, создаем пустую структуру
        return {"users": []}

    try:
        with open(USERS_JSON_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"✗ Ошибка парсинга JSON в {USERS_JSON_PATH}: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Ошибка чтения файла {USERS_JSON_PATH}: {e}")
        sys.exit(1)


def save_users_json(data: dict):
    """
    Сохраняет обновленные данные в users.json.

    Args:
        data: Словарь с данными для сохранения
    """
    try:
        with open(USERS_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✓ Файл {USERS_JSON_PATH} успешно обновлен")
    except Exception as e:
        print(f"✗ Ошибка сохранения файла {USERS_JSON_PATH}: {e}")
        sys.exit(1)


def main():
    """
    Основная функция скрипта.
    """
    print(f"Базовый URL: {BASE_URL}")
    print(f"Endpoint: {API_ENDPOINT}")
    print("-" * 60)

    # Загружаем данные для авторизации
    auth_data = load_auth_data()
    if not auth_data:
        print("✗ В файле user_auth_data.json нет данных для авторизации!")
        sys.exit(1)

    print(f"Найдено пользователей для авторизации: {len(auth_data)}\n")

    # Загружаем текущий users.json
    users_data = load_users_json()

    # Статистика
    success_count = 0
    error_count = 0
    updated_users = []

    # Авторизуем каждого пользователя
    for auth_info in auth_data:
        phone = auth_info.get("phone")
        password = auth_info.get("password")
        first_name = auth_info.get("first_name", "")
        last_name = auth_info.get("last_name", "")

        if not phone or not password:
            print(f"⚠ Пропущен пользователь без phone или password: {auth_info}")
            error_count += 1
            continue

        # Авторизуем пользователя
        login_result = login_user(phone, password)

        if login_result:
            # Добавляем пользователя в список обновленных
            user_entry = {
                "user_id": login_result["user_id"],
                "token": login_result["token"],
                "message": "Пользователь успешно зарегистрирован",
            }
            updated_users.append(user_entry)
            success_count += 1
        else:
            error_count += 1

        print()  # Пустая строка для читаемости

    # Обновляем users.json
    if updated_users:
        users_data["users"] = updated_users
        save_users_json(users_data)
    else:
        print("⚠ Нет успешно авторизованных пользователей для обновления файла")

    # Выводим итоговую статистику
    print("-" * 60)
    print("Итоги:")
    print(f"  Успешно авторизовано: {success_count}")
    print(f"  Ошибок: {error_count}")
    print(f"  Всего обработано: {len(auth_data)}")
    print(f"  Обновлено в users.json: {len(updated_users)}")

    if error_count > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
