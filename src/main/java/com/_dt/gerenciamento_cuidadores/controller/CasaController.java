package com._dt.gerenciamento_cuidadores.controller;


import com._dt.gerenciamento_cuidadores.entities.Casa;
import com._dt.gerenciamento_cuidadores.repositories.CasaRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
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

    @PostMapping
    public String criarCasa(@RequestBody Casa casa){

        try {
            repository.save(casa);
            return "Salvo com sucesso 👌";

        }
        catch (Exception e){
            return "Deu ruim em bixo";
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

