package com._dt.gerenciamento_cuidadores.controller;

import com._dt.gerenciamento_cuidadores.entities.Casa;
import com._dt.gerenciamento_cuidadores.entities.Socio;
import com._dt.gerenciamento_cuidadores.repositories.CasaRepository;
import com._dt.gerenciamento_cuidadores.util.Validacoes;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/casas")
public class CasaController {

    private final CasaRepository repository;

    public CasaController(CasaRepository repository){
        this.repository = repository;
    }

    @GetMapping
    public List<Casa> mostrar(){
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Casa> buscarId(@PathVariable int id){
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<String> criarCasa(@RequestBody Casa casa){

        String erro = validar(casa);
        if (erro != null) {
            return ResponseEntity.badRequest().body(erro);
        }

        casa.setId(0);
        normalizar(casa);
        casa.setSocios(casa.getSocios()); // garante o vínculo de cada sócio com a casa
        repository.save(casa);
        return ResponseEntity.ok("Salvo com sucesso 👌");
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<String> atualizar(@PathVariable int id, @RequestBody Casa dados){

        Casa casa = repository.findById(id).orElse(null);
        if (casa == null) {
            return ResponseEntity.status(404).body("Casa não encontrada!");
        }

        String erro = validar(dados);
        if (erro != null) {
            return ResponseEntity.badRequest().body(erro);
        }

        normalizar(dados);
        casa.setNome(dados.getNome());
        casa.setEndereco(dados.getEndereco());
        casa.setCep(dados.getCep());
        casa.setDono(dados.getDono());
        casa.setDonoTelefone(dados.getDonoTelefone());
        casa.setDonoEmail(dados.getDonoEmail());
        casa.setValor(dados.getValor());
        casa.setSocios(dados.getSocios());

        repository.save(casa);
        return ResponseEntity.ok("Atualizado com sucesso!");
    }

    @DeleteMapping("/{id}")
    public String deletar(@PathVariable int id){

        repository.deleteById(id);
        return "Deletado com sucesso!";
    }

    /* ---------- validação / normalização ---------- */

    private String validar(Casa c) {
        if (Validacoes.vazio(c.getNome())) return "Informe o nome da casa.";
        if (!Validacoes.cepValido(c.getCep())) return "CEP inválido. Use o formato 00000-000.";
        if (!Validacoes.telefoneValido(c.getDonoTelefone())) return "Telefone do dono inválido.";
        if (!Validacoes.emailValido(c.getDonoEmail())) return "E-mail do dono inválido.";
        if (c.getValor() < 0) return "O valor não pode ser negativo.";

        for (Socio s : c.getSocios()) {
            if (Validacoes.vazio(s.getNome())) return "Todo sócio precisa ter um nome.";
            if (!Validacoes.telefoneValido(s.getTelefone())) return "Telefone inválido para o sócio " + s.getNome() + ".";
            if (!Validacoes.emailValido(s.getEmail())) return "E-mail inválido para o sócio " + s.getNome() + ".";
        }
        return null;
    }

    private void normalizar(Casa c) {
        c.setNome(Validacoes.limpar(c.getNome()));
        c.setEndereco(Validacoes.limpar(c.getEndereco()));
        c.setCep(Validacoes.limpar(c.getCep()));
        c.setDono(Validacoes.limpar(c.getDono()));
        c.setDonoTelefone(Validacoes.limpar(c.getDonoTelefone()));
        c.setDonoEmail(Validacoes.limpar(c.getDonoEmail()));
        for (Socio s : c.getSocios()) {
            s.setNome(Validacoes.limpar(s.getNome()));
            s.setTelefone(Validacoes.limpar(s.getTelefone()));
            s.setEmail(Validacoes.limpar(s.getEmail()));
        }
    }
}
