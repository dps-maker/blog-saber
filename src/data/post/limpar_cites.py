import os
import re
from pathlib import Path

# Executa na pasta onde o script está
DIRETORIO_ALVO = Path(".")

# Encontra exatamente
PADRAO_CITE = re.compile(r'\]+\]', re.IGNORECASE)

def limpar_arquivo(caminho_arquivo: Path):
    with open(caminho_arquivo, "r", encoding="utf-8") as f:
        conteudo_original = f.read()

    # 1. Remove todas as marcações
    conteudo_limpo = PADRAO_CITE.sub("", conteudo_original)

    # 2. Corrige espaçamentos estranhos deixados antes de pontuações (ex: "texto ." -> "texto.")
    conteudo_limpo = re.sub(r'[ \t]+([.,;:!?])', r'\1', conteudo_limpo)

    # 3. Remove múltiplos espaços em branco consecutivos no meio do texto
    conteudo_limpo = re.sub(r'[ \t]{2,}', ' ', conteudo_limpo)

    if conteudo_limpo != conteudo_original:
        with open(caminho_arquivo, "w", encoding="utf-8") as f:
            f.write(conteudo_limpo)
        print(f"✔ Limpo: {caminho_arquivo.name}")
        return True
    return False

def main():
    extensoes = {".md", ".mdx"}
    total_modificados = 0
    total_verificados = 0
    arquivo_script = Path(__file__).resolve()

    print(f"Iniciando varredura em: {Path.cwd()}")

    for root, _, files in os.walk(DIRETORIO_ALVO):
        for file in files:
            caminho = Path(root) / file

            # Ignora o próprio script em execução
            if caminho.resolve() == arquivo_script:
                continue

            if caminho.suffix.lower() in extensoes:
                total_verificados += 1
                if limpar_arquivo(caminho):
                    total_modificados += 1

    print(f"\nFinalizado! {total_modificados} de {total_verificados} arquivos foram limpos.")

if __name__ == "__main__":
    main()