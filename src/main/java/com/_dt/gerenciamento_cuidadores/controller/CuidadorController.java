package com._dt.gerenciamento_cuidadores.controller;

import com._dt.gerenciamento_cuidadores.entities.Cuidador;
import com._dt.gerenciamento_cuidadores.repositories.CuidadorRepository;
import com._dt.gerenciamento_cuidadores.util.Validacoes;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("api/cuidadores")
public class CuidadorController {

    // Limite de segurança para a foto em data URL (~3 MB de texto)
    private static final int FOTO_MAX_CHARS = 3_000_000;

    private final CuidadorRepository repository;

    public CuidadorController(CuidadorRepository repository){
        this.repository = repository;
    }

    @GetMapping
    public List<Cuidador> mostrar(){
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Cuidador> buscarId(@PathVariable int id){
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<String> criarCuidador(@RequestBody Cuidador cuidador){

        String erro = validar(cuidador);
        if (erro != null) {
            return ResponseEntity.badRequest().body(erro);
        }

        cuidador.setId(0);
        normalizar(cuidador);
        repository.save(cuidador);
        return ResponseEntity.ok("Salvo com sucesso 👌");
    }

    @PutMapping("/{id}")
    public ResponseEntity<String> atualizar(@PathVariable int id, @RequestBody Cuidador dados){

        Cuidador cuidador = repository.findById(id).orElse(null);
        if (cuidador == null) {
            return ResponseEntity.status(404).body("Cuidador não encontrado!");
        }

        String erro = validar(dados);
        if (erro != null) {
            return ResponseEntity.badRequest().body(erro);
        }

        normalizar(dados);
        cuidador.setNome(dados.getNome());
        cuidador.setTelefone(dados.getTelefone());
        cuidador.setCpf(dados.getCpf());
        cuidador.setFoto(dados.getFoto());   // null remove a foto

        repository.save(cuidador);
        return ResponseEntity.ok("Atualizado com sucesso!");
    }

    @DeleteMapping("/{id}")
    public String deletar(@PathVariable int id){

        repository.deleteById(id);
        return "Deletado com sucesso!";
    }

    /* ---------- validação / normalização ---------- */

    private String validar(Cuidador c) {
        if (Validacoes.vazio(c.getNome())) return "Informe o nome do cuidador.";
        if (!Validacoes.cpfValido(c.getCpf())) return "CPF inválido.";
        if (!Validacoes.telefoneValido(c.getTelefone())) return "Telefone inválido.";
        if (!Validacoes.vazio(c.getFoto())) {
            if (!c.getFoto().startsWith("data:image/")) return "A foto precisa ser uma imagem.";
            if (c.getFoto().length() > FOTO_MAX_CHARS) return "A foto é grande demais.";
        }
        return null;
    }

    private void normalizar(Cuidador c) {
        c.setNome(Validacoes.limpar(c.getNome()));
        c.setTelefone(Validacoes.limpar(c.getTelefone()));
        c.setCpf(Validacoes.formatarCpf(c.getCpf()));
        c.setFoto(Validacoes.limpar(c.getFoto()));
    }
}
