#!/usr/bin/env python3
"""
Скрипт для загрузки аватарок пользователей на сервер.
Читает данные пользователей из users.json и загружает соответствующие фото.
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
API_ENDPOINT = f"{BASE_URL}/api/v1/users/me/photo"

# Путь к файлу с данными пользователей
USERS_JSON_PATH = Path(__file__).parent / "users.json"

# Папка с фото
PHOTOS_DIR = Path(__file__).parent


def find_photo_file(user_id: int) -> Path | None:
    """
    Находит файл фото для пользователя по его ID.
    Ищет файлы с именем, начинающимся с user_id и любым расширением изображения.
    """
    # Список возможных расширений изображений
    image_extensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".gif",
        ".jfif",
        ".avif",
        ".bmp",
    ]

    # Сначала пробуем точное совпадение имени файла с user_id
    for ext in image_extensions:
        photo_path = PHOTOS_DIR / f"{user_id}{ext}"
        if photo_path.exists():
            return photo_path

    # Если не нашли, пробуем найти файлы, начинающиеся с user_id
    for file_path in PHOTOS_DIR.iterdir():
        if file_path.is_file():
            name_without_ext = file_path.stem
            if name_without_ext == str(user_id):
                return file_path

    return None


def upload_photo(user_id: int, token: str, photo_path: Path) -> bool:
    """
    Загружает фото пользователя на сервер.

    Args:
        user_id: ID пользователя
        token: JWT токен пользователя
        photo_path: Путь к файлу фото

    Returns:
        True если загрузка успешна, False в противном случае
    """
    try:
        # Открываем файл для загрузки
        with open(photo_path, "rb") as photo_file:
            # Подготавливаем заголовки с токеном
            headers = {"Authorization": f"Bearer {token}"}

            # Подготавливаем multipart/form-data запрос
            files = {
                "photo": (photo_path.name, photo_file, get_content_type(photo_path))
            }

            # Отправляем запрос
            print(f"Загрузка фото для пользователя {user_id} ({photo_path.name})...")
            response = requests.post(
                API_ENDPOINT, headers=headers, files=files, timeout=30
            )

            # Проверяем результат
            if response.status_code == 200:
                result = response.json()
                photo_url = result.get("photo_url", "N/A")
                print(f"✓ Успешно загружено для пользователя {user_id}")
                print(f"  URL: {photo_url}")
                return True
            else:
                error_msg = "Неизвестная ошибка"
                try:
                    error_data = response.json()
                    error_msg = error_data.get("error", {}).get("message", error_msg)
                except:
                    error_msg = response.text[:200]

                print(f"✗ Ошибка для пользователя {user_id}: {response.status_code}")
                print(f"  {error_msg}")
                return False

    except FileNotFoundError:
        print(f"✗ Файл не найден: {photo_path}")
        return False
    except requests.exceptions.RequestException as e:
        print(f"✗ Ошибка сети для пользователя {user_id}: {e}")
        return False
    except Exception as e:
        print(f"✗ Неожиданная ошибка для пользователя {user_id}: {e}")
        return False


def get_content_type(file_path: Path) -> str:
    """
    Определяет Content-Type для файла по его расширению.
    """
    ext = file_path.suffix.lower()
    content_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".jfif": "image/jpeg",
        ".avif": "image/avif",
        ".bmp": "image/bmp",
    }
    return content_types.get(ext, "image/jpeg")


def main():
    """
    Основная функция скрипта.
    """
    print(f"Базовый URL: {BASE_URL}")
    print(f"Endpoint: {API_ENDPOINT}")
    print("-" * 60)

    # Проверяем существование файла users.json
    if not USERS_JSON_PATH.exists():
        print(f"✗ Файл {USERS_JSON_PATH} не найден!")
        sys.exit(1)

    # Читаем данные пользователей
    try:
        with open(USERS_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"✗ Ошибка парсинга JSON: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Ошибка чтения файла: {e}")
        sys.exit(1)

    users = data.get("users", [])
    if not users:
        print("✗ В файле users.json нет пользователей!")
        sys.exit(1)

    print(f"Найдено пользователей: {len(users)}\n")

    # Статистика
    success_count = 0
    error_count = 0
    skipped_count = 0

    # Обрабатываем каждого пользователя
    for user in users:
        user_id = user.get("user_id")
        token = user.get("token")

        if not user_id:
            print(f"⚠ Пропущен пользователь без user_id: {user}")
            skipped_count += 1
            continue

        if not token:
            print(f"⚠ Пропущен пользователь {user_id} без токена")
            skipped_count += 1
            continue

        # Ищем файл фото
        photo_path = find_photo_file(user_id)
        if not photo_path:
            print(f"⚠ Фото не найдено для пользователя {user_id}")
            skipped_count += 1
            continue

        # Загружаем фото
        if upload_photo(user_id, token, photo_path):
            success_count += 1
        else:
            error_count += 1

        print()  # Пустая строка для читаемости

    # Выводим итоговую статистику
    print("-" * 60)
    print("Итоги:")
    print(f"  Успешно: {success_count}")
    print(f"  Ошибок: {error_count}")
    print(f"  Пропущено: {skipped_count}")
    print(f"  Всего: {len(users)}")

    if error_count > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
