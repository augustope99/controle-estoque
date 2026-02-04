@echo off
echo ========================================
echo   Deploy para GitHub Pages
echo ========================================
echo.

echo 1. Inicializando repositorio Git...
git init

echo 2. Adicionando arquivos...
git add .

echo 3. Fazendo commit inicial...
git commit -m "Initial commit: Sistema de Controle de Estoque"

echo 4. Configurando branch main...
git branch -M main

echo 5. Conectando ao repositorio remoto...
echo IMPORTANTE: Substitua 'SEU-USUARIO' e 'NOME-DO-REPO' pelos valores corretos!
echo Exemplo: git remote add origin https://github.com/joao123/controle-estoque.git
echo.
set /p repo_url="Digite a URL do seu repositorio GitHub: "
git remote add origin %repo_url%

echo 6. Enviando para GitHub...
git push -u origin main

echo.
echo ========================================
echo   Configurando GitHub Pages
echo ========================================
echo.
echo PASSOS MANUAIS no GitHub:
echo 1. Va para: Settings ^> Pages
echo 2. Source: Deploy from a branch
echo 3. Branch: main / (root)
echo 4. Save
echo.
echo Seu site estara disponivel em:
echo https://SEU-USUARIO.github.io/NOME-DO-REPO
echo.
echo Deploy concluido!
pause