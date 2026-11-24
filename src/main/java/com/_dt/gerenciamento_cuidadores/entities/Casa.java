package com._dt.gerenciamento_cuidadores.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.util.ArrayList;
import java.util.List;

@Entity
public class Casa {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @NotBlank
    private String nome;
    private String endereco;
    private String cep;
    private String dono;
    private String donoTelefone;

    @Email
    private String donoEmail;
    private double valor;

    @OneToMany(mappedBy = "casa", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Socio> socios = new ArrayList<>();

    public Casa() {
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

    public String getCep() {
        return cep;
    }

    public void setCep(String cep) {
        this.cep = cep;
    }

    public String getDono() {
        return dono;
    }

    public void setDono(String dono) {
        this.dono = dono;
    }

    public String getDonoTelefone() {
        return donoTelefone;
    }

    public void setDonoTelefone(String donoTelefone) {
        this.donoTelefone = donoTelefone;
    }

    public String getDonoEmail() {
        return donoEmail;
    }

    public void setDonoEmail(String donoEmail) {
        this.donoEmail = donoEmail;
    }

    public double getValor() {
        return valor;
    }

    public void setValor(double valor) {
        this.valor = valor;
    }

    public List<Socio> getSocios() {
        return socios;
    }


    public void setSocios(List<Socio> novos) {
        if (this.socios == null) this.socios = new ArrayList<>();
        List<Socio> copia = novos == null ? new ArrayList<>() : new ArrayList<>(novos);
        this.socios.clear();
        for (Socio s : copia) {
            s.setId(0);        // sempre recriados; ids vindos do cliente são ignorados
            s.setCasa(this);
            this.socios.add(s);
        }
    }
}
