# ベースイメージとして node:20-alpine を使用
FROM node:20-alpine

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