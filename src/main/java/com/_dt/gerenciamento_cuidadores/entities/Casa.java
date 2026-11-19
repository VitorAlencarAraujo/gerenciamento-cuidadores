package com._dt.gerenciamento_cuidadores.entities;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Casa {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    private String nome;
    private String endereco;
    private String dono;
    private double valor;


    public Casa(int id, String nome, String endereco, String dono, double valor) {
        this.id = id;
        this.nome = nome;
        this.endereco = endereco;
        this.dono = dono;
        this.valor = valor;
    }

    public Casa(String nome, String endereco, String dono, double valor) {
        this.nome = nome;
        this.endereco = endereco;
        this.dono = dono;
        this.valor = valor;
    }

    public Casa(){

    }

    //    Getters e Setters

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getEndereco() {
        return endereco;
    }

    public void setEndereco(String endereco) {
        this.endereco = endereco;
    }

    public String getDono() {
        return dono;
    }

    public void setDono(String dono) {
        this.dono = dono;
    }

    public double getValor() {
        return valor;
    }

    public void setValor(double valor) {
        this.valor = valor;
    }
}
