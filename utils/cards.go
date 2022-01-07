package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"regexp"
	"strings"
)

type ALSACard struct {
	name        string
	description string
}

func ParseALSACards(filename string) {
	// Sample file:
	// 0 [bcm2835-jack   ]: bcm2835_headphonbcm2835 Headphones - bcm2835 Headphones
	//                      bcm2835 Headphones
	// 1 [dac            ]: RPi-simple - snd_rpi_hifiberry_dac
	//                      snd_rpi_hifiberry_dac
	var cards []ALSACard
	lines := readFileByLine(filename)
	for _, line := range lines {

		if strings.Contains(line, "]:") {
			var card ALSACard

			// name
			r := regexp.MustCompile(`\[(.*?)\]`)
			matches := r.FindAllStringSubmatch(line, -1)
			for _, v := range matches {
				card.name = v[1]
				break
			}

			// description
			r = regexp.MustCompile(`\](.*?)`)
			matches = r.FindAllStringSubmatch(line, -1)
			for _, v := range matches {
				card.description = v[1]
				break
			}

			cards = append(cards, card)
		}
	}

	fmt.Println("%v", cards)
}

func readFileByLine(filename string) []string {
	file, err := os.Open(filename)

	if err != nil {
		log.Fatalf("Failed to open file: %v", filename)
	}

	scanner := bufio.NewScanner(file)
	scanner.Split(bufio.ScanLines)

	var lines []string
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}

	err = file.Close()
	if err != nil {
		log.Fatalf("Failed to close file: %s", filename)
	}

	return lines
}
