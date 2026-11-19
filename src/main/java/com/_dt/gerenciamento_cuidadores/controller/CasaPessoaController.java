package com._dt.gerenciamento_cuidadores.controller;

import com._dt.gerenciamento_cuidadores.entities.CasaPessoa;
import com._dt.gerenciamento_cuidadores.repositories.CasaPessoaRepository;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/casa-pessoas")
public class CasaPessoaController {

    private final CasaPessoaRepository repository;

    public CasaPessoaController(CasaPessoaRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<CasaPessoa> mostrar() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public Optional<CasaPessoa> buscarId(@PathVariable Integer id) {
        return repository.findById(id);
    }

    @PostMapping
    public CasaPessoa criarCasaPessoa(@RequestBody CasaPessoa casaPessoa) {
        return repository.save(casaPessoa);
    }

    @PutMapping("/{id}")
    public String atualizar(@PathVariable Integer id, @RequestBody CasaPessoa casaPessoa) {

        if (repository.existsById(id)) {

            casaPessoa.setId(id);
            repository.save(casaPessoa);

            return "Atualizado com sucesso!";
        }

        return "Vínculo não encontrado!";
    }

    @DeleteMapping("/{id}")
    public String deletar(@PathVariable Integer id) {

        if (repository.existsById(id)) {
            repository.deleteById(id);
            return "Deletado com sucesso!";
        }

        return "Vínculo não encontrado!";
    }
}

