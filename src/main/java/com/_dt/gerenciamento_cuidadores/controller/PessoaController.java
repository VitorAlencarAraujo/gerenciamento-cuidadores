package com._dt.gerenciamento_cuidadores.controller;

import com._dt.gerenciamento_cuidadores.entities.Cuidador;
import com._dt.gerenciamento_cuidadores.entities.Pessoa;
import com._dt.gerenciamento_cuidadores.repositories.PessoaRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pessoas")
public class PessoaController {

    private final PessoaRepository repository;

    public PessoaController(PessoaRepository repository){
        this.repository = repository;
    }

    @GetMapping
    public List<Pessoa> mostrar(){
        return repository.findAll();
    }

    @PostMapping
    public String criarPessoa(@RequestBody Pessoa pessoa){

        try {
            repository.save(pessoa);
            return "Salvo com sucesso 👌";

        }
        catch (Exception e){
            return "Deu ruim ein bixo";
        }
    }

    @DeleteMapping("/{id}")
    public String deletar(@PathVariable int id){

        repository.deleteById(id);
        return "Deletado com sucesso!";
    }

    @GetMapping("/{id}")
    public void buscarId(@PathVariable int id){
        repository.findById(id);
    }
}
