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
    (i32.store
      (local.get $a)
      (local.tee $t
        (i32.add
          (i32.load (local.get $a))
          (i32.load (local.get $b)))))

    (i32.store
      (local.get $d)
      (i32.rotl
        (i32.xor
          (i32.load (local.get $d))
          (local.get $t))
        (i32.const 16)))

    ;; x[c] = x[c] + x[d];
    ;; t = x[b] ^ x[c];
    ;; x[b] = t << 12 | t >>> 20;
    (i32.store
      (local.get $c)
      (local.tee $t
        (i32.add
          (i32.load (local.get $c))
          (i32.load (local.get $d)))))

    (i32.store
      (local.get $b)
      (i32.rotl
        (i32.xor
          (i32.load (local.get $b))
          (local.get $t))
        (i32.const 12)))

    ;; x[a] = x[a] + x[b];
    ;; t = x[d] ^ x[a];
    ;; x[d] = t << 8 | t >>> 24;
    (i32.store
      (local.get $a)
      (local.tee $t
        (i32.add
          (i32.load (local.get $a))
          (i32.load (local.get $b)))))

    (i32.store
      (local.get $d)
      (i32.rotl
        (i32.xor
          (i32.load (local.get $d))
          (local.get $t))
        (i32.const 8)))

    ;; x[c] = x[c] + x[d];
    ;; t = x[b] ^ x[c];
    ;; x[b] = t << 7 | t >>> 25;
    (i32.store
      (local.get $c)
      (local.tee $t
        (i32.add
          (i32.load (local.get $c))
          (i32.load (local.get $d)))))

    (i32.store
      (local.get $b)
      (i32.rotl
        (i32.xor
          (i32.load (local.get $b))
          (local.get $t))
        (i32.const 7)))
  )

  (func $next_bytes
    (param $rounds i32)
    (local $t i32)
    (local $j i32)

    ;; Copy context into scratch space
    (local.set $j (i32.const 0))
    (block
      (loop
        ;; Move 8 bytes at a time
        ;; from j (context) to j + 128 (scratch)
        (i64.store
          (i32.add (local.get $j) (i32.const 128))
          (i64.load (local.get $j)))

        ;; Increment by 8 bytes
        ;; and break if we hit 64
        (br_if 1
          (i32.eq
            (i32.const 64)
            (local.tee $j
              (i32.add (local.get $j) (i32.const 8)))))
        (br 0)
      )
    )
  
    ;; Perform rounds on data in scratch space
    (block
      (loop
        (call $quarterround
          (i32.const 128) (i32.const 132)
          (i32.const 136) (i32.const 140))
        (call $quarterround
          (i32.const 129) (i32.const 133)
          (i32.const 137) (i32.const 141))
        (call $quarterround
          (i32.const 130) (i32.const 134)
          (i32.const 138) (i32.const 142))
        (call $quarterround
          (i32.const 131) (i32.const 135)
          (i32.const 139) (i32.const 143))
          
        (call $quarterround
          (i32.const 128) (i32.const 133)
          (i32.const 138) (i32.const 143))
        (call $quarterround
          (i32.const 129) (i32.const 134)
          (i32.const 139) (i32.const 140))
        (call $quarterround
          (i32.const 130) (i32.const 135)
          (i32.const 136) (i32.const 141))
        (call $quarterround
          (i32.const 131) (i32.const 132)
          (i32.const 137) (i32.const 142))

        (br_if 1
          (i32.eqz
            (local.tee $rounds
              (i32.sub (local.get $rounds) (i32.const 2)))))
        (br 0)
      )
    )

    ;; Copy scratch space to output in little-endian order   
    (local.set $rounds (i32.const 0))

    ;; output starts at 64
    (local.set $j (i32.const 64))
    (block
      (loop
        ;; Add context back into
        ;; scratch data as we go
        (local.set $t
          (i32.add
            (i32.load
              (i32.add
                (i32.const 128) ;; scratch space starts at 128
                (local.get $rounds)))
            (i32.load (local.get $rounds))))

        (i32.store8
          (local.get $j)
          (local.get $t))

        (i32.store8
          (local.tee $j (i32.add (local.get $j) (i32.const 1)))
          (i32.shr_u (local.get $t) (i32.const 8)))

        (i32.store8
          (local.tee $j (i32.add (local.get $j) (i32.const 1)))
          (i32.shr_u (local.get $t) (i32.const 16)))
        
        (i32.store8
          (local.tee $j (i32.add (local.get $j) (i32.const 1)))
          (i32.shr_u (local.get $t) (i32.const 24)))

        ;; j++
        (local.set $j (i32.add (local.get $j) (i32.const 1)))

        (br_if 1
          (i32.eq
            (i32.const 16)
            (local.tee $rounds
              (i32.add (local.get $rounds) (i32.const 1)))))
        (br 0)
      )
    )
    
    (i32.store
      (i32.const 48)
      (local.tee $j
        (i32.add
          (i32.load (i32.const 48))
          (i32.const 1))))

    (block
      (br_if 1 (i32.ne (i32.const 0) (local.get $j)))
      (i32.store
        (i32.const 52)
        (i32.add
          (i32.const 1)
          (i32.load (i32.const 52))))
    )
  )
  (export "next_bytes" (func $next_bytes))
)