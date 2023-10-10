#
# gcc -mfpu=neon -g -O3 -Wall shatest.c sha256.S
#
# SHA256 library, using neon SIMD instructions.
#

#define __ASSEMBLY__
.macro  VLOAD x
	vld1.64 {q\x}, [r0]!
	vrev32.8 q\x, q\x
.endm
.macro HASH x
	vmov q7, q\x
	bl hs
.endm
.macro RMW x
	ldr r0, [r1, #-4]
	add r0, r0, r\x
	str r0, [r1, #-4]!
.endm
.macro ROR d s b
	vshr.u32 \d, \s, #\b
	vsli.u32 \d, \s, #(32-\b)
.endm
.macro LSR d s b
	vshr.u32 \d, \s, #\b
.endm
.macro XOR d s
	veor.u32 \d, \d, \s
.endm
.macro VAD d s
	vadd.u32 \d, \d, \s
.endm
.macro REV4
	ldmia r0, {r1-r4}
	rev r1, r1
	rev r2, r2
	rev r3, r3
	rev r4, r4
	stmia r0, {r1-r4}
.endm

.data
.globl k, h
.balign 32
k:
	.word 0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5
	.word 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5
	.word 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3
	.word 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174
	.word 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc
	.word 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da
	.word 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7
	.word 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967
	.word 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13
	.word 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85
	.word 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3
	.word 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070
	.word 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5
	.word 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3
	.word 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208
	.word 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
h:
	.word 0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a
	.word 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19

.bss
.balign 32
w: . = . + 256

.text
hs:
	push {r1, r12}
	add r12, r0, #16
1:
	vmov.u32 r10, d14[0]

	mov  r11, r6, ror #6
	eor  r11, r11, r6, ror #11
	# R11 <- S1
	eor  r11, r11, r6, ror #25
	add r10, r10, r11
	# H + w[i] + S1
	add r10, r10, r9
	ldr r11, [r0], #4
	# H + w[i] + S1 + k[i]
	add r10, r10, r11
	and r11, r6, r7
	bic r1,  r8, r6
	# ch
	eor r11, r11, r1
	# temp1
	add r10, r10, r11
	# H = G, G = F, F = E, E = D + temp1
	mov r9, r8
	mov r8, r7
	mov r7, r6
	# R5 is free now.
	add r6, r5, r10

	# S0
	mov r5, r2, ror #2
	eor r5, r5, r2, ror #13
	eor r5, r5, r2, ror #22

	# maj
	and r1, r2, r3
	and r11, r2, r4
	eor r1, r1, r11
	and r11, r3, r4
	eor r1, r1, r11

	# temp2
	add r1, r1, r5

	mov r5, r4
	mov r4, r3
	mov r3, r2
	add r2, r1, r10

	vext.32 q7, q7, q7, #1

	cmp r0, r12
	blt 1b
	pop {r1, r12}
	mov pc, lr

.globl sha256_update
sha256_update:
	push {r4-r11, lr}
	vpush {q4-q7}

	VLOAD 0
	VLOAD 1
	VLOAD 2
	VLOAD 3

	ldmia r1!, {r2-r9}

	ldr r0, =k
	add r12, r0, #256
	HASH 0
	HASH 1
	HASH 2
	HASH 3
1:
	vext.32 q4, q0, q1, #1

	ROR q5, q4, 7
	ROR q6, q4, 18
	XOR q6, q5
	LSR q5, q4, 3
	# Q6 <- s0
	XOR q6, q5
	VAD q6, q0
	# w[i - 7]
	vext.32 q4, q2, q3, #1
	# s0 + w[i-16] + w[i-7]
	VAD q6, q4

	ROR d8, d7, 17
	ROR d9, d7, 19
	XOR d9, d8
	LSR d8, d7, 10
	XOR d9, d8

	VAD d12, d9

	ROR d8, d12, 17
	ROR d9, d12, 19
	XOR d9, d8 
	LSR d8, d12, 10
	XOR d9, d8
	VAD d13, d9

	vmov.u32 q0, q1
	vmov.u32 q1, q2
	vmov.u32 q2, q3
	vmov.u32 q3, q6

	HASH 3
	cmp r0, r12
	blt 1b

	RMW 9
	RMW 8
	RMW 7
	RMW 6
	RMW 5
	RMW 4
	RMW 3
	RMW 2

	vpop {q4-q7}
	pop {r4-r11, pc}

#define CTX_BUF 0
#define CTX_BSZ 64
#define CTX_STA 64
#define CTX_BIT 96
#define CTX_LEN 104
#define PAD 8

#
# uint8_t *sha256_final(struct sha256_context *context) 
#
.globl sha256_final
sha256_final:
	push {lr}

	mov r3, #0
	ldr r1, [r0, #CTX_LEN]
	mov r2, #0x80
	strb r2, [r0, r1]
	add r1, r1, #1
	cmp r1, #(CTX_BSZ-PAD)
	bls 1f
2:
	cmp r1, #CTX_BSZ
	bhs 2f
	strb r3, [r0, r1]
	add r1, r1, #1
	b 2b
2:
	add r1, r0, #CTX_BSZ
	push {r0-r2}
	bl sha256_update
	pop  {r0-r2}

	mov r1, #0
1:
	mov r3, #0
	strb r3, [r0, r1]
	add r1, r1, #1
	cmp r1, #(CTX_BSZ-PAD)
	blo 1b

	ldr r2, [r0, #CTX_BIT]
	ldr r3, [r0, #(CTX_BIT + 4)]
	ldr r12, [r0, #CTX_LEN]
	add r2, r2, r12, lsl #3
	rev r2, r2
	rev r3, r3
	str r3, [r0, r1]
	add r1, r1, #4
	str r2, [r0, r1]

	add r1, r0, #CTX_BSZ
	push {r0}
	bl sha256_update
	pop  {r0}
	push {r4}
	add r0, r0, #CTX_STA
	REV4
	add r0, r0, #16
	REV4
	pop  {r4}
	sub r0, r0, #16

	pop {pc}

#if 0
#
# sha256_progress(struct sha256_context *context, uint8_t data[], uint32_t len)
#
.globl sha256_progress
sha256_progress:
	push {r4-r7, lr}
	ldr r3, [r0, #CTX_LEN]
2:
	ldrb r12, [r1], #1
	strb r12, [r0, r3]
	ldr r4, [r0, #CTX_BIT]
	ldr r5, [r0, #(CTX_BIT + 4)]
	adds r4, r4, #8
	adc  r5, r5, #0
	str r4, [r0, #CTX_BIT]
	str r5, [r0, #(CTX_BIT + 4)]
	add r3, r3, #1
	cmp r3, #64
	bne 1f
# update state every 512 bits
	mov r4, r0
	mov r5, r1
	mov r6, r2
	mov r7, r3
	add r1, r0, #CTX_BSZ
	bl sha256_update
	mov r0, r4
	mov r1, r5
	mov r2, r6
	mov r3, r7
	mov r3, #0
1:
	str r3, [r0, #CTX_LEN]
	subs r2, r2, #1
	bne  2b

	pop {r4-r7, pc}
#endif

#
# sha256_init(sha256_context *context)
# struct sha256_context {
#         uint8_t  buf[64];
#         uint32_t state[8];
#         uint64_t bitlen;
#         uint32_t datalen;
# };
#
.globl sha256_init
sha256_init:
	add r0, r0, #CTX_STA
	ldr r1, =h
	add r3, r1, #32
1:
	ldr r2, [r1], #4
	str r2, [r0], #4
	cmp r1, r3
	blo 1b
	mov r1, #0
	str r1, [r0], #4
	str r1, [r0], #4
	str r1, [r0], #4
	mov pc, lr