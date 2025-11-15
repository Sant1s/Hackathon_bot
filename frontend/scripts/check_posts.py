#!/usr/bin/env python3
"""
Скрипт для проверки, что посты созданы на сервере.
Сравнивает посты из posts.json с постами на сервере.
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

# Путь к файлу с данными постов
SCRIPT_DIR = Path(__file__).parent
POSTS_JSON_PATH = SCRIPT_DIR / "posts.json"


def load_expected_posts() -> list:
    """
    Загружает ожидаемые посты из posts.json.
    
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


def get_posts_from_server() -> list:
    """
    Получает список постов с сервера.
    
    Returns:
        Список словарей с данными постов с сервера
    """
    try:
        print(f"Запрос к серверу: {API_ENDPOINT}...")
        response = requests.get(API_ENDPOINT, timeout=30)
        
        if response.status_code != 200:
            error_msg = "Неизвестная ошибка"
            try:
                error_data = response.json()
                error_msg = error_data.get("error", {}).get("message", error_msg)
            except:
                error_msg = response.text[:200]
            
            print(f"✗ Ошибка получения постов ({response.status_code}): {error_msg}")
            return []
        
        result = response.json()
        posts = result.get("data", [])
        return posts
        
    except requests.exceptions.RequestException as e:
        print(f"✗ Ошибка сети: {e}")
        return []
    except Exception as e:
        print(f"✗ Неожиданная ошибка: {e}")
        return []


def normalize_title(title: str) -> str:
    """
    Нормализует заголовок для сравнения (убирает лишние пробелы, приводит к нижнему регистру).
    
    Args:
        title: Заголовок поста
    
    Returns:
        Нормализованный заголовок
    """
    return " ".join(title.lower().split())


def check_posts(expected_posts: list, server_posts: list):
    """
    Проверяет, что все ожидаемые посты созданы на сервере.
    
    Args:
        expected_posts: Список ожидаемых постов из posts.json
        server_posts: Список постов с сервера
    """
    print(f"\nОжидается постов: {len(expected_posts)}")
    print(f"Найдено на сервере: {len(server_posts)}\n")
    print("-" * 60)
    
    # Создаем словарь постов с сервера по user_id и нормализованному заголовку
    server_posts_map = {}
    for post in server_posts:
        user_id = post.get("user_id")
        title = normalize_title(post.get("title", ""))
        key = (user_id, title)
        server_posts_map[key] = post
    
    # Статистика
    found_count = 0
    not_found_count = 0
    details = []
    
    # Проверяем каждый ожидаемый пост
    for expected in expected_posts:
        expected_id = expected.get("id")
        expected_user_id = expected.get("user_id")
        expected_title = expected.get("title", "")
        expected_amount = expected.get("amount", 0)
        
        normalized_title = normalize_title(expected_title)
        key = (expected_user_id, normalized_title)
        
        server_post = server_posts_map.get(key)
        
        if server_post:
            server_id = server_post.get("id")
            server_amount = server_post.get("amount", 0)
            server_status = server_post.get("status", "unknown")
            
            # Проверяем соответствие суммы
            amount_match = abs(float(server_amount) - float(expected_amount)) < 0.01
            
            status_icon = "✓" if amount_match else "⚠"
            found_count += 1
            
            details.append({
                "expected_id": expected_id,
                "server_id": server_id,
                "title": expected_title[:50] + ("..." if len(expected_title) > 50 else ""),
                "user_id": expected_user_id,
                "status": server_status,
                "amount_match": amount_match,
                "expected_amount": expected_amount,
                "server_amount": server_amount,
                "found": True,
            })
            
            if amount_match:
                print(f"{status_icon} Пост #{expected_id} '{expected_title[:40]}...' найден (ID на сервере: {server_id}, статус: {server_status})")
            else:
                print(f"{status_icon} Пост #{expected_id} '{expected_title[:40]}...' найден, но сумма не совпадает!")
                print(f"   Ожидалось: {expected_amount} ₽, на сервере: {server_amount} ₽")
        else:
            not_found_count += 1
            details.append({
                "expected_id": expected_id,
                "server_id": None,
                "title": expected_title[:50] + ("..." if len(expected_title) > 50 else ""),
                "user_id": expected_user_id,
                "status": "not found",
                "amount_match": False,
                "expected_amount": expected_amount,
                "server_amount": None,
                "found": False,
            })
            print(f"✗ Пост #{expected_id} '{expected_title[:40]}...' (user_id: {expected_user_id}) НЕ НАЙДЕН")
    
    # Выводим итоговую статистику
    print("-" * 60)
    print("Итоги проверки:")
    print(f"  Найдено: {found_count}/{len(expected_posts)}")
    print(f"  Не найдено: {not_found_count}/{len(expected_posts)}")
    
    if not_found_count > 0:
        print(f"\n⚠ Не найдено постов: {not_found_count}")
        print("\nДетали не найденных постов:")
        for detail in details:
            if not detail["found"]:
                print(f"  - Пост #{detail['expected_id']}: '{detail['title']}' (user_id: {detail['user_id']})")
    
    # Проверяем, есть ли лишние посты на сервере
    if len(server_posts) > len(expected_posts):
        extra_count = len(server_posts) - len(expected_posts)
        print(f"\nℹ На сервере есть дополнительные посты: {extra_count}")
    
    return not_found_count == 0


def main():
    """
    Основная функция скрипта.
    """
    print(f"Базовый URL: {BASE_URL}")
    print(f"Endpoint: {API_ENDPOINT}")
    print("-" * 60)
    
    # Загружаем ожидаемые посты
    expected_posts = load_expected_posts()
    if not expected_posts:
        print("✗ В файле posts.json нет постов!")
        sys.exit(1)
    
    print(f"Загружено ожидаемых постов: {len(expected_posts)}")
    
    # Получаем посты с сервера
    server_posts = get_posts_from_server()
    if server_posts is None:
        print("✗ Не удалось получить посты с сервера!")
        sys.exit(1)
    
    # Проверяем посты
    all_found = check_posts(expected_posts, server_posts)
    
    if all_found:
        print("\n✓ Все посты успешно созданы!")
        sys.exit(0)
    else:
        print("\n✗ Не все посты найдены на сервере!")
        sys.exit(1)


if __name__ == "__main__":
    main()
