@Program written by Hamed Adefuwa
@Part of computer architecture university module

.data
.balign 4
return: .word 0


.text
.global main
@ ---------------------------------------------------------------------------------------------

@Here's the program in C
@i = 7;
@c = 0;
@a = 7;
@do {
@ c = c + a;
@ a++;
@ i ++ ;
@} while (i > 6 && i < 15) ;

@ ---------------------------------------------------------------------------------------------
main: 

	mov r0, #7 		@i = 7
	mov r1, #0 		@c = 0
	mov r2, #7 		@a = 7

do:
	add r1, r1, r2		@c = c + a;
	add r2, #1		@a++
	add r0, #1		@i++
	cmp r0, #6		@is i > 6
	bgt lessthan6		@keep looping if i is greater than 6
	blt exit		@exit if i is less than 6	

lessthan6:
	cmp r0, #15		@is i < 15
	blt do			@redo loop if i is less than 15
	beq exit		@exit if i is equal to 15
exit:
	swi 0
