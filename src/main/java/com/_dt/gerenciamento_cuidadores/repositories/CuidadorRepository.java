package com._dt.gerenciamento_cuidadores.repositories;

import com._dt.gerenciamento_cuidadores.entities.Cuidador;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CuidadorRepository extends JpaRepository<Cuidador, Integer> {
}
