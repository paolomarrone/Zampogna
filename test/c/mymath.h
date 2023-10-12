#ifndef MYMATH_H
#define MYMATH_H

float multf (float x1, float x2) {
	return x1 * x2;
}

void modulo (int x, int n, int* y, int* r) {
	*y = x / n;
	*r = x % n;
}

#endif