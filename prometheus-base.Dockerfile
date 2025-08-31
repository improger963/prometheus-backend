# Используем стабильную, долго поддерживаемую версию Ubuntu
FROM ubuntu:22.04

# Устанавливаем переменные окружения, чтобы избежать интерактивных запросов при установке
ENV DEBIAN_FRONTEND=noninteractive

# Обновляем список пакетов и устанавливаем все необходимые инструменты одной командой
# - git: для работы с репозиториями
# - python3, python3-pip: для Python-скриптов
# - curl, wget: для скачивания файлов
# - nano, vim: текстовые редакторы, которые LLM часто пытаются использовать
# - tree: для удобного просмотра структуры директорий
# - build-essential: метапакет, включающий gcc, g++, make - для возможной компиляции
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git \
    python3 \
    python3-pip \
    curl \
    wget \
    nano \
    vim \
    tree \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Устанавливаем Node.js и npm (пример для Node 20.x)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Создаем нашу стандартную рабочую директорию
RUN mkdir /app

# Устанавливаем рабочую директорию по умолчанию для самого контейнера
WORKDIR /app

# Определяем команду по умолчанию (просто чтобы контейнер не завершался сразу)
CMD ["/bin/bash"]