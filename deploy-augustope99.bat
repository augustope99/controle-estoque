@echo off
echo ==========================================
echo   DEPLOY PARA GITHUB PAGES
echo ==========================================
echo.

echo Fazendo deploy para: augustope99/controle-estoque
echo.

git init
git add .
git commit -m "Sistema de Controle de Estoque - Deploy"
git branch -M main
git remote add origin https://github.com/augustope99/controle-estoque.git
git push -u origin main

echo.
echo ==========================================
echo   ATIVANDO GITHUB PAGES
echo ==========================================
echo.
echo ACESSE: https://github.com/augustope99/controle-estoque/settings/pages
echo Source: Deploy from a branch
echo Branch: main
echo Folder: / (root)
echo Save
echo.
echo SEU SITE: https://augustope99.github.io/controle-estoque
echo.
echo Deploy concluido!
pause