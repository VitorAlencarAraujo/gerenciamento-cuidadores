package com._dt.gerenciamento_cuidadores.util;

import java.util.regex.Pattern;


public final class Validacoes {

    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$");

    private Validacoes() {
    }

    public static boolean vazio(String s) {
        return s == null || s.isBlank();
    }

    public static String somenteDigitos(String s) {
        return s == null ? "" : s.replaceAll("\\D", "");
    }

    /** Valida CPF pelos dígitos verificadores (aceita com ou sem máscara). */
    public static boolean cpfValido(String cpf) {
        if (vazio(cpf)) return true;
        String d = somenteDigitos(cpf);
        if (d.length() != 11) return false;
        if (d.chars().distinct().count() == 1) return false; // 111.111.111-11 etc.
        return digitoCpf(d, 9) == d.charAt(9) - '0' && digitoCpf(d, 10) == d.charAt(10) - '0';
    }

    private static int digitoCpf(String d, int tamanho) {
        int soma = 0;
        for (int i = 0; i < tamanho; i++) {
            soma += (d.charAt(i) - '0') * (tamanho + 1 - i);
        }
        int resto = (soma * 10) % 11;
        return resto == 10 ? 0 : resto;
    }

    /** Formata 11 dígitos como 000.000.000-00 (devolve o valor original se não tiver 11 dígitos). */
    public static String formatarCpf(String cpf) {
        if (vazio(cpf)) return null;
        String d = somenteDigitos(cpf);
        if (d.length() != 11) return cpf.trim();
        return d.substring(0, 3) + "." + d.substring(3, 6) + "." + d.substring(6, 9) + "-" + d.substring(9);
    }

    /** Telefone brasileiro com DDD: 10 (fixo) ou 11 (celular) dígitos. */
    public static boolean telefoneValido(String tel) {
        if (vazio(tel)) return true;
        String d = somenteDigitos(tel);
        return d.length() == 10 || d.length() == 11;
    }

    public static boolean emailValido(String email) {
        if (vazio(email)) return true;
        return EMAIL.matcher(email.trim()).matches();
    }

    public static boolean cepValido(String cep) {
        if (vazio(cep)) return true;
        return somenteDigitos(cep).length() == 8;
    }

    /** Converte string vazia em null e remove espaços nas pontas. */
    public static String limpar(String s) {
        return vazio(s) ? null : s.trim();
    }
}
