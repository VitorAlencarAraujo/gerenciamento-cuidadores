package com._dt.gerenciamento_cuidadores.repositories;

import com._dt.gerenciamento_cuidadores.entities.Casa;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CasaRepository extends JpaRepository<Casa, Integer> {
}
