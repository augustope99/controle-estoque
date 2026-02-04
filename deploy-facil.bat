@echo off
echo ==========================================
echo   DEPLOY AUTOMATICO - GITHUB PAGES
echo ==========================================
echo.

echo Passo 1: Criando repositorio no GitHub...
echo.
echo ACESSE: https://github.com/new
echo Nome do repositorio: controle-estoque
echo Marque: Public
echo NAO marque: Add README
echo Clique: Create repository
echo.
pause

echo Passo 2: Copiando comandos...
echo.
echo COPIE E COLE estes comandos no terminal:
echo.
echo git init
echo git add .
echo git commit -m "Sistema de Controle de Estoque"
echo git branch -M main
echo git remote add origin https://github.com/SEU-USUARIO/controle-estoque.git
echo git push -u origin main
echo.
echo SUBSTITUA "SEU-USUARIO" pelo seu usuario do GitHub!
echo.
pause

echo Passo 3: Ativando GitHub Pages...
echo.
echo ACESSE: https://github.com/SEU-USUARIO/controle-estoque/settings/pages
echo Source: Deploy from a branch
echo Branch: main
echo Folder: / (root)
echo Save
echo.
echo SEU SITE: https://SEU-USUARIO.github.io/controle-estoque
echo.
echo PRONTO! Deploy concluido!
pause