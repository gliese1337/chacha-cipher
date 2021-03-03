(module
  (memory (export "memory") 1)
  ;; ctx: 0 - 63
  ;; output: 64 - 127
  ;; scratch: 128 - 192
  (func $quarterround
    (param $a i32) ;; offset by 128
    (param $b i32) ;; offset by 128
    (param $c i32) ;; offset by 128
    (param $d i32) ;; offset by 128
    (local $t i32)

    ;; x[a] = x[a] + x[b];
    ;; t = x[d] ^ x[a];
    ;; x[d] = t << 16 | t >>> 16;
    (i32.add
      (i32.load (local.get $a))
      (i32.load (local.get $b)))
    local.tee $t
    local.get $a
    i32.store

    (i32.xor
      (i32.load (local.get $d))
      (local.get $t))
    i32.const 16
    i32.rotl
    local.get $d
    i32.store

    ;; x[c] = x[c] + x[d];
    ;; t = x[b] ^ x[c];
    ;; x[b] = t << 12 | t >>> 20;
    (i32.add
      (i32.load (local.get $c))
      (i32.load (local.get $d)))
    local.tee $t
    local.get $c
    i32.store

    (i32.xor
      (i32.load (local.get $b))
      (local.get $t))
    i32.const 12
    i32.rotl
    local.get $b
    i32.store

    ;; x[a] = x[a] + x[b];
    ;; t = x[d] ^ x[a];
    ;; x[d] = t << 8 | t >>> 24;
    (i32.add
      (i32.load (local.get $a))
      (i32.load (local.get $b)))
    local.tee $t
    local.get $a
    i32.store

    (i32.xor
      (i32.load (local.get $d))
      (local.get $t))
    i32.const 8
    i32.rotl
    local.get $d
    i32.store

    ;; x[c] = x[c] + x[d];
    ;; t = x[b] ^ x[c];
    ;; x[b] = t << 7 | t >>> 25;
    (i32.add
      (i32.load (local.get $c))
      (i32.load (local.get $d)))
    local.tee $t
    local.get $c
    i32.store

    (i32.xor
      (i32.load (local.get $b))
      (local.get $t))
    i32.const 7
    i32.rotl
    local.get $b
    i32.store
  )

  (func $next_bytes
    (param $rounds i32)
    (local $t i32)
    (local $j i32)

    ;; Copy context into scratch space
    i32.const 0
    local.set $j
    (loop
      ;; Move 8 bytes at a time
      local.get $j
      i64.load
      (i32.add (local.get $j) (i32.const 128))
      i64.store

      ;; Increment by 8 bytes
      (i32.add (local.get $j) (i32.const 8))
      local.tee $j
      i32.const 64
      i32.eq
      br_if 1
      br 0
    )
  
    ;; Perform rounds on data in scratch space
    (loop
      i32.const 128
      i32.const 132
      i32.const 136
      i32.const 140
      call $quarterround
      
      i32.const 129
      i32.const 133
      i32.const 137
      i32.const 141
      call $quarterround
      
      i32.const 130
      i32.const 134
      i32.const 138
      i32.const 142
      call $quarterround
      
      i32.const 131
      i32.const 135
      i32.const 139
      i32.const 143
      call $quarterround

      
      i32.const 128
      i32.const 133
      i32.const 138
      i32.const 143
      call $quarterround

      i32.const 129
      i32.const 134
      i32.const 139
      i32.const 140
      call $quarterround

      i32.const 130
      i32.const 135
      i32.const 136
      i32.const 141
      call $quarterround

      i32.const 131
      i32.const 132
      i32.const 137
      i32.const 142
      call $quarterround

      (i32.sub (local.get $rounds) (i32.const 2))
      local.tee $rounds
      i32.eqz
      br_if 1
      br 0
    )

    ;; Copy scratch space to output in little-endian order
   
    i32.const 0
    local.set $rounds

    i32.const 64 ;; output starts at 64
    local.set $j

    (loop
      ;; Add context back into
      ;; scratch data as we go
      (i32.add
        (i32.load
          (i32.add
            (i32.const 128) ;; scratch space starts at 128
            (local.get $rounds)))
        (i32.load (local.get $rounds)))

      ;; store the lowest byte first
      local.tee $t
      local.get $j
      i32.store8

      ;; shift t and inc j to store the next byte
      (i32.shr_u (local.get $t) (i32.const 8))
      (i32.add (local.get $j) (i32.const 1))
      local.tee $j
      i32.store8

      ;; shift t and inc j to store the next byte
      (i32.shr_u (local.get $t) (i32.const 16))
      (i32.add (local.get $j) (i32.const 1))
      local.tee $j
      i32.store8
      
      ;; shift t and inc j to store the next byte
      (i32.shr_u (local.get $t) (i32.const 24))
      (i32.add (local.get $j) (i32.const 1))
      local.tee $j
      i32.store8

      ;; inc j to set up for next iteration
      (i32.add (local.get $j) (i32.const 1))
      local.set $j

      (i32.add (local.get $rounds) (i32.const 1))
      local.tee $rounds
      i32.const 16
      i32.eq
      br_if 1
      br 0
    )
    i32.const 12
    i32.load
    i32.const 1
    i32.add
    i32.const 12
    i32.store
    (block
      i32.const 12
      i32.load
      i32.eqz
      br_if 1
      i32.const 13
      i32.load
      i32.const 1
      i32.add
      i32.const 13
      i32.store
    )    
  )
  (export "next_bytes" (func $next_bytes))
)