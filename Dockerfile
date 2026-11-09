# ベースイメージとして node:26-alpine を使用
FROM node:26-alpine

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

# Next.js のビルド成果物を使用するため、環境変数を設定
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# アプリケーションを起動
CMD ["npm", "start"]
