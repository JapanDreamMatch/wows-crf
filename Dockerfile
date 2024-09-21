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

# 環境変数を設定
ENV WOWS_API_APP_ID=${WOWS_API_APP_ID}
ENV NEXT_PUBLIC_PAGE_URL=${NEXT_PUBLIC_PAGE_URL}
ENV NEXT_PUBLIC_DISCORD_LINK=${DISCORD_LINK}
ENV REGISTER_SHEET_ID=${REGISTER_SHEET_ID}
ENV GOOGLE_SERVICE_ACCOUNT_EMAIL=${GOOGLE_SERVICE_ACCOUNT_EMAIL}
ENV GOOGLE_PRIVATE_KEY=${GOOGLE_PRIVATE_KEY}
ENV NEXT_PUBLIC_TEST_SECRET=${TEST_SECRET}

# Next.js アプリケーションをビルド
RUN npm run build

EXPOSE 8080

# アプリケーションを起動
# CMD ["npm", "start"]