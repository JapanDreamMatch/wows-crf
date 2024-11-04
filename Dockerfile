# ベースイメージとして node:20-alpine を使用
FROM node:20-alpine

# ビルド時の引数として環境変数を定義
ARG TEST_SECRET

# 定義した引数を環境変数として設定
ENV NEXT_PUBLIC_TEST_SECRET=$TEST_SECRET

# 作業ディレクトリを設定
WORKDIR /app

# package.json と package-lock.json をコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm install

# アプリケーションのソースコードをコピー
COPY . .

# Next.js アプリケーションをビルド
RUN npm run build

EXPOSE 8080

# アプリケーションを起動
CMD ["npm", "start"]