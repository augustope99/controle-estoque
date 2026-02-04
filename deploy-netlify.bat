@echo off
echo ==========================================
echo   DEPLOY PARA NETLIFY (COM SAP HANA)
echo ==========================================
echo.

echo Fazendo deploy integrado...
echo.

git init
git add .
git commit -m "Sistema com integração SAP HANA via Netlify Functions"
git branch -M main
git remote add origin https://github.com/augustope99/controle-estoque.git
git push -u origin main

echo.
echo ==========================================
echo   CONFIGURANDO NETLIFY
echo ==========================================
echo.
echo 1. Acesse: https://app.netlify.com/
echo 2. New site from Git
echo 3. Conecte com GitHub
echo 4. Escolha: augustope99/controle-estoque
echo 5. Deploy settings:
echo    - Build command: (deixe vazio)
echo    - Publish directory: . (ponto)
echo 6. Deploy site
echo.
echo SEU SITE: https://nome-do-site.netlify.app
echo.
echo FUNCIONALIDADES:
echo - Busca por código do cliente no SAP HANA
echo - Busca por CNPJ na ReceitaWS
echo - Fallback para busca local
echo.
echo Deploy concluído!
pause