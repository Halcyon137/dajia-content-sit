# GitHub 免费部署说明

1. 在 GitHub 新建一个**私有仓库**，把本目录文件上传到 `main` 分支。
2. 进入仓库的 Settings → Secrets and variables → Actions，新增：
   - `SITE_URL`
   - `SITE_USERNAME`
   - `SITE_PASSWORD`
3. 进入 Settings → Pages，选择 GitHub Actions 作为发布来源。
4. `pages.yml` 会发布网页；`fetch.yml` 会在每天 00:00、01:30、03:00、04:30……每 1.5 小时运行一次，并更新 `data.json`。
5. 不要把网站密码、GitHub 密码或访问令牌写进代码或发送到聊天中。

GitHub Actions 的定时任务可能有少量延迟，且免费额度与仓库类型有关；抓取脚本只保存页面文字和附件链接，不自动公开账户凭据。
