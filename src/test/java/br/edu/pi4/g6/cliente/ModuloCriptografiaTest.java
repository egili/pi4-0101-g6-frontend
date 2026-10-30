package br.edu.pi4.g6.cliente;

import static org.junit.jupiter.api.Assertions.assertNotEquals;

import br.puc.cofre.backend2.dto.CryptoResponse;
import br.puc.cofre.backend2.service.CryptoService;
import org.junit.jupiter.api.Test;

class ModuloCriptografiaTest {

    @Test
    void usaModuloDeCriptografia() {
        CryptoResponse resposta = new CryptoService().gerarCredenciais("senhaMestraDeTeste");
        assertNotEquals(resposta.getHashLogin(), resposta.getChaveCifra());
    }
}
