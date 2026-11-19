
package com._dt.gerenciamento_cuidadores.controller;

import com._dt.gerenciamento_cuidadores.entities.Alocacao;
import com._dt.gerenciamento_cuidadores.repositories.AlocacaoRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/alocacoes")
public class AlocacaoController {

    private final AlocacaoRepository repository;

    public AlocacaoController(AlocacaoRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Alocacao> mostrar() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public Optional<Alocacao> buscarId(@PathVariable Integer id) {
        return repository.findById(id);
    }

    @PostMapping
    public Alocacao criarAlocacao(@RequestBody Alocacao alocacao) {
        return repository.save(alocacao);
    }

    @PutMapping("/{id}")
    public String atualizar(@PathVariable Integer id, @RequestBody Alocacao alocacao) {

        if (repository.existsById(id)) {

            alocacao.setId(id);
            repository.save(alocacao);

            return "Atualizado com sucesso!";
        }

        return "Alocação não encontrada!";
    }

    @DeleteMapping("/{id}")
    public String deletar(@PathVariable Integer id) {

        if (repository.existsById(id)) {
            repository.deleteById(id);
            return "Deletado com sucesso!";
        }

        return "Alocação não encontrada!";
    }
}
