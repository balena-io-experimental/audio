package main

// "os"
// "strings"

// func check(e error) {
// 	if e != nil {
// 		panic(e)
// 	}
// }

const filename string = "test/cards"

func main() {
	// fi, err := os.Lstat(filename)
	// check(err)
	// fperm := fi.Mode().Perm()

	// dat, err := os.ReadFile(filename)
	// check(err)

	// replaced := strings.Replace(string(dat), "bye", "hello", -1)

	// err2 := os.WriteFile(filename, []byte(replaced), fperm)
	// check(err2)
	ParseALSACards(filename)
}
