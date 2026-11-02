package cofre;

import static org.junit.jupiter.api.Assertions.assertNotEquals;

import org.junit.jupiter.api.Test;

class ModuloCriptografiaTest {

    @Test
    void usaModuloDeCriptografia() {
        CryptoResponse resposta = new CryptoService().gerarCredenciais("senhaMestraDeTeste");
        assertNotEquals(resposta.getHashLogin(), resposta.getChaveCifra());
    }
}
