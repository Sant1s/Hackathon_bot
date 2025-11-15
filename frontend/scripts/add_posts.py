#!/usr/bin/env python3
"""
Скрипт для создания постов на сервере.
Читает данные из users.json, posts.json и загружает фото из posts_pictures.
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
API_ENDPOINT = f"{BASE_URL}/api/v1/posts"

# Пути к файлам
SCRIPT_DIR = Path(__file__).parent
USERS_JSON_PATH = SCRIPT_DIR / "users.json"
POSTS_JSON_PATH = SCRIPT_DIR / "posts.json"
POSTS_PICTURES_DIR = SCRIPT_DIR / "posts_pictures"


def load_users() -> dict:
    """
    Загружает данные пользователей из users.json.

    Returns:
        Словарь {user_id: token}
    """
    if not USERS_JSON_PATH.exists():
        print(f"✗ Файл {USERS_JSON_PATH} не найден!")
        sys.exit(1)

    try:
        with open(USERS_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)

        users = {}
        for user in data.get("users", []):
            user_id = user.get("user_id")
            token = user.get("token")
            if user_id and token:
                users[user_id] = token

        return users
    except json.JSONDecodeError as e:
        print(f"✗ Ошибка парсинга JSON в {USERS_JSON_PATH}: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Ошибка чтения файла {USERS_JSON_PATH}: {e}")
        sys.exit(1)


def load_posts() -> list:
    """
    Загружает данные постов из posts.json.

    Returns:
        Список словарей с данными постов
    """
    if not POSTS_JSON_PATH.exists():
        print(f"✗ Файл {POSTS_JSON_PATH} не найден!")
        sys.exit(1)

    try:
        with open(POSTS_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("posts", [])
    except json.JSONDecodeError as e:
        print(f"✗ Ошибка парсинга JSON в {POSTS_JSON_PATH}: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Ошибка чтения файла {POSTS_JSON_PATH}: {e}")
        sys.exit(1)


def find_post_photo(post_id: int) -> Path | None:
    """
    Находит фото для поста по его ID.
    Ищет файлы с именем, начинающимся с post_id и любым расширением изображения.

    Args:
        post_id: ID поста

    Returns:
        Путь к файлу фото или None
    """
    if not POSTS_PICTURES_DIR.exists():
        return None

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

    # Сначала пробуем точное совпадение имени файла с post_id
    for ext in image_extensions:
        photo_path = POSTS_PICTURES_DIR / f"{post_id}{ext}"
        if photo_path.exists():
            return photo_path

    # Если не нашли, пробуем найти файлы, начинающиеся с post_id
    for file_path in POSTS_PICTURES_DIR.iterdir():
        if file_path.is_file():
            name_without_ext = file_path.stem
            if name_without_ext == str(post_id):
                return file_path

    return None


def get_content_type(file_path: Path) -> str:
    """
    Определяет Content-Type для файла по его расширению.

    Args:
        file_path: Путь к файлу

    Returns:
        Content-Type строка
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


def create_post(post_data: dict, token: str, photo_path: Path | None) -> bool:
    """
    Создает пост на сервере.

    Args:
        post_data: Словарь с данными поста
        token: JWT токен пользователя
        photo_path: Путь к файлу фото (опционально)

    Returns:
        True если создание успешно, False в противном случае
    """
    try:
        # Подготавливаем заголовки с токеном
        headers = {"Authorization": f"Bearer {token}"}

        # Подготавливаем данные формы
        form_data = {
            "title": post_data.get("title", ""),
            "description": post_data.get("description", ""),
            "amount": str(post_data.get("amount", 0)),
            "recipient": post_data.get("recipient", ""),
            "bank": post_data.get("bank", ""),
            "phone": post_data.get("phone", ""),
        }

        # Отправляем запрос
        post_id = post_data.get("id", "?")
        title = post_data.get("title", "Без названия")
        print(f"Создание поста #{post_id}: '{title}'...")

        if photo_path:
            print(f"  С фото: {photo_path.name}")

        # Подготавливаем файлы (открываем файл только когда он нужен)
        files = None
        photo_file = None
        if photo_path and photo_path.exists():
            photo_file = open(photo_path, "rb")
            files = {
                "media": (
                    photo_path.name,
                    photo_file,
                    get_content_type(photo_path),
                )
            }

        try:
            response = requests.post(
                API_ENDPOINT,
                headers=headers,
                data=form_data,
                files=files,
                timeout=60,
            )
        finally:
            # Закрываем файл после отправки запроса
            if photo_file:
                photo_file.close()

        # Проверяем результат
        if response.status_code == 201:
            result = response.json()
            created_post_id = result.get("id", "?")
            print(f"✓ Пост успешно создан: ID={created_post_id}")
            return True
        elif response.status_code == 403:
            error_msg = "Неизвестная ошибка"
            try:
                error_data = response.json()
                error_msg = error_data.get("error", {}).get("message", error_msg)
            except:
                error_msg = response.text[:200]

            if (
                "не верифицирован" in error_msg.lower()
                or "not verified" in error_msg.lower()
            ):
                print(f"✗ Ошибка: Пользователь не верифицирован")
                print(f"  Для создания постов пользователь должен быть верифицирован.")
                print(
                    f"  Необходимо сначала подать заявку на верификацию и получить одобрение от администратора."
                )
            else:
                print(f"✗ Ошибка создания поста ({response.status_code}): {error_msg}")
            return False
        else:
            error_msg = "Неизвестная ошибка"
            try:
                error_data = response.json()
                error_msg = error_data.get("error", {}).get("message", error_msg)
            except:
                error_msg = response.text[:200]

            print(f"✗ Ошибка создания поста ({response.status_code}): {error_msg}")
            return False

    except FileNotFoundError:
        if photo_path:
            print(f"✗ Файл не найден: {photo_path}")
        return False
    except requests.exceptions.RequestException as e:
        print(f"✗ Ошибка сети: {e}")
        return False
    except Exception as e:
        print(f"✗ Неожиданная ошибка: {e}")
        return False


def main():
    """
    Основная функция скрипта.
    """
    print(f"Базовый URL: {BASE_URL}")
    print(f"Endpoint: {API_ENDPOINT}")
    print("-" * 60)

    # Загружаем данные пользователей
    users = load_users()
    if not users:
        print("✗ В файле users.json нет пользователей с токенами!")
        sys.exit(1)

    print(f"Загружено пользователей: {len(users)}")

    # Загружаем данные постов
    posts = load_posts()
    if not posts:
        print("✗ В файле posts.json нет постов!")
        sys.exit(1)

    print(f"Загружено постов: {len(posts)}\n")

    # Проверяем наличие директории с фото
    if not POSTS_PICTURES_DIR.exists():
        print(
            f"⚠ Директория {POSTS_PICTURES_DIR} не найдена, посты будут созданы без фото\n"
        )

    # Статистика
    success_count = 0
    error_count = 0
    skipped_count = 0

    # Создаем каждый пост
    for post_data in posts:
        post_id = post_data.get("id")
        user_id = post_data.get("user_id")
        title = post_data.get("title", "Без названия")

        # Проверяем наличие токена пользователя
        if user_id not in users:
            print(
                f"⚠ Пропущен пост #{post_id} '{title}': пользователь {user_id} не найден в users.json"
            )
            skipped_count += 1
            continue

        token = users[user_id]

        # Ищем фото для поста
        photo_path = find_post_photo(post_id)
        if not photo_path:
            print(f"⚠ Фото не найдено для поста #{post_id}, будет создан без фото")

        # Создаем пост
        if create_post(post_data, token, photo_path):
            success_count += 1
        else:
            error_count += 1

        print()  # Пустая строка для читаемости

    # Выводим итоговую статистику
    print("-" * 60)
    print("Итоги:")
    print(f"  Успешно создано: {success_count}")
    print(f"  Ошибок: {error_count}")
    print(f"  Пропущено: {skipped_count}")
    print(f"  Всего обработано: {len(posts)}")

    if error_count > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
