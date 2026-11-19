package com._dt.gerenciamento_cuidadores.controller;


import com._dt.gerenciamento_cuidadores.entities.Cuidador;
import com._dt.gerenciamento_cuidadores.repositories.CuidadorRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("api/cuidadores")
public class CuidadorController {

    private final CuidadorRepository repository;

    public CuidadorController(CuidadorRepository repository){
        this.repository = repository;
    }

    @GetMapping
    public List<Cuidador> mostrar(){
        return repository.findAll();
    }

    @PostMapping
    public String criarCuidador(@RequestBody Cuidador cuidador){

        try {
            repository.save(cuidador);
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
