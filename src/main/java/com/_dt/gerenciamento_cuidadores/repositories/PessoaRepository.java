package com._dt.gerenciamento_cuidadores.repositories;

import com._dt.gerenciamento_cuidadores.entities.Pessoa;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PessoaRepository extends JpaRepository<Pessoa, Integer> {
}
